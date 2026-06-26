import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/shipments/[id]/boxes — Batch create box groups
// Body: { groups: [{ count, dimension?, items: [{ shipmentItemId, qtyPerBox }] }] }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { groups } = body as {
      groups?: {
        count: number;
        dimension?: { lengthCm?: number; widthCm?: number; heightCm?: number; weightKg?: number };
        items: { shipmentItemId: string; qtyPerBox: number }[];
      }[];
    };

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ error: "Cần ít nhất một nhóm thùng" }, { status: 400 });
    }

    // Validate each group
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      if (!group.count || group.count < 1) {
        return NextResponse.json(
          { error: `Nhóm ${g + 1}: số lượng thùng phải >= 1` },
          { status: 400 }
        );
      }
      if (!group.items || group.items.length === 0) {
        return NextResponse.json(
          { error: `Nhóm ${g + 1}: cần ít nhất một SKU` },
          { status: 400 }
        );
      }
      for (const item of group.items) {
        if (item.qtyPerBox < 0) {
          return NextResponse.json(
            { error: `Nhóm ${g + 1}: số lượng mỗi thùng không được âm` },
            { status: 400 }
          );
        }
      }
    }

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        items: { select: { id: true, totalQty: true } },
        boxes: { select: { id: true } },
      },
    });
    if (!shipment) {
      return NextResponse.json({ error: "Không tìm thấy lô hàng" }, { status: 404 });
    }

    if (shipment.status !== "draft" && shipment.status !== "packing") {
      return NextResponse.json(
        { error: "Chỉ có thể tạo thùng khi lô hàng ở trạng thái draft hoặc packing" },
        { status: 400 }
      );
    }

    if (shipment.items.length === 0) {
      return NextResponse.json(
        { error: "Cần thêm ít nhất một SKU vào lô hàng trước khi tạo thùng" },
        { status: 400 }
      );
    }

    // Build a map of shipmentItemId → totalQty
    const totalQtyMap = new Map<string, number>();
    for (const item of shipment.items) {
      totalQtyMap.set(item.id, item.totalQty);
    }

    // Validate: sum(qtyPerBox × count) must equal totalQty for every shipmentItem
    const computedMap = new Map<string, number>();
    for (const group of groups) {
      for (const item of group.items) {
        const prev = computedMap.get(item.shipmentItemId) || 0;
        computedMap.set(item.shipmentItemId, prev + item.qtyPerBox * group.count);
      }
    }

    const discrepancies: { shipmentItemId: string; expected: number; got: number }[] = [];
    for (const [itemId, expected] of totalQtyMap) {
      const got = computedMap.get(itemId) || 0;
      if (got !== expected) {
        discrepancies.push({ shipmentItemId: itemId, expected, got });
      }
    }
    // Also check for unknown shipmentItemIds
    for (const itemId of computedMap.keys()) {
      if (!totalQtyMap.has(itemId)) {
        return NextResponse.json(
          { error: `SKU ${itemId} không thuộc lô hàng này` },
          { status: 400 }
        );
      }
    }

    if (discrepancies.length > 0) {
      return NextResponse.json(
        {
          error: "Tổng số lượng phân bổ không khớp với số lượng cần gửi",
          discrepancies,
        },
        { status: 400 }
      );
    }

    // All good — create boxes in a transaction
    const existingBoxCount = shipment.boxes.length;
    const allCreatedBoxes: { id: string; boxName: string; sourceBoxId: string | null }[] = [];

    await db.$transaction(async (tx) => {
      let boxIndex = existingBoxCount;

      for (const group of groups) {
        const dim = group.dimension || {};

        // Create the source box (first box in group)
        const sourceBox = await tx.shipmentBox.create({
          data: {
            boxName: `Box ${boxIndex + 1}`,
            shipmentId: id,
            lengthCm: dim.lengthCm ?? null,
            widthCm: dim.widthCm ?? null,
            heightCm: dim.heightCm ?? null,
            weightKg: dim.weightKg ?? null,
          },
        });
        allCreatedBoxes.push({ id: sourceBox.id, boxName: sourceBox.boxName, sourceBoxId: null });

        // Add items to source box
        for (const item of group.items) {
          if (item.qtyPerBox > 0) {
            await tx.shipmentBoxItem.create({
              data: {
                shipmentBoxId: sourceBox.id,
                shipmentItemId: item.shipmentItemId,
                qtyPerBox: item.qtyPerBox,
              },
            });
          }
        }

        boxIndex++;

        // Create copies (count - 1)
        for (let c = 1; c < group.count; c++) {
          const copyBox = await tx.shipmentBox.create({
            data: {
              boxName: `Box ${boxIndex + 1}`,
              shipmentId: id,
              sourceBoxId: sourceBox.id,
              lengthCm: dim.lengthCm ?? null,
              widthCm: dim.widthCm ?? null,
              heightCm: dim.heightCm ?? null,
              weightKg: dim.weightKg ?? null,
            },
          });
          allCreatedBoxes.push({ id: copyBox.id, boxName: copyBox.boxName, sourceBoxId: sourceBox.id });

          // Same items as source
          for (const item of group.items) {
            if (item.qtyPerBox > 0) {
              await tx.shipmentBoxItem.create({
                data: {
                  shipmentBoxId: copyBox.id,
                  shipmentItemId: item.shipmentItemId,
                  qtyPerBox: item.qtyPerBox,
                },
              });
            }
          }

          boxIndex++;
        }
      }
    });

    // Mark associated production requests as shipped
    // Collect all shipmentItemIds used in groups
    const shippedItemIds = new Set<string>();
    for (const group of groups) {
      for (const item of group.items) {
        shippedItemIds.add(item.shipmentItemId);
      }
    }
    if (shippedItemIds.size > 0) {
      // Find productionRequestIds linked to these shipment items
      const shipmentItems = await db.shipmentItem.findMany({
        where: { id: { in: Array.from(shippedItemIds) } },
        select: { productionRequestId: true },
      });
      const prIds = [...new Set(shipmentItems.map(si => si.productionRequestId).filter(Boolean))];
      if (prIds.length > 0) {
        await db.productionRequest.updateMany({
          where: { id: { in: prIds as string[] } },
          data: { shipped: true },
        });
      }
    }

    // Transition to packing if currently draft
    if (shipment.status === "draft") {
      await db.shipment.update({
        where: { id },
        data: { status: "packing" },
      });
    }

    return NextResponse.json(allCreatedBoxes, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/boxes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
