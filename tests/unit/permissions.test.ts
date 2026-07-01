import { describe, it, expect } from "vitest";
import { can, canManageUser, getRoleLabel, getRoleOrder, type Role } from "@/lib/permissions";

describe("permissions — can()", () => {
  describe("employee", () => {
    const role: Role = "employee";

    it("can create ideas", () => expect(can(role, "create_idea")).toBe(true));
    it("can view own ideas", () => expect(can(role, "view_own_ideas")).toBe(true));
    it("can view all ideas", () => expect(can(role, "view_all_ideas")).toBe(true));
    it("can delete own ideas", () => expect(can(role, "delete_own_idea")).toBe(true));
    it("can edit own profile", () => expect(can(role, "edit_own_profile")).toBe(true));
    it("can update production", () => expect(can(role, "update_production")).toBe(true));
    it("can manage orders", () => expect(can(role, "manage_orders")).toBe(true));
    it("can manage shipments", () => expect(can(role, "manage_shipments")).toBe(true));
    it("can view own stats", () => expect(can(role, "view_own_stats")).toBe(true));

    it("cannot approve ideas", () => expect(can(role, "approve_idea")).toBe(false));
    it("cannot delete any idea", () => expect(can(role, "delete_any_idea")).toBe(false));
    it("cannot assign photo task", () => expect(can(role, "assign_photo_task")).toBe(false));
    it("cannot approve photos", () => expect(can(role, "approve_photos")).toBe(false));
    it("cannot request photo revision", () => expect(can(role, "request_photo_revision")).toBe(false));
    it("cannot manage topics", () => expect(can(role, "manage_topics")).toBe(false));
    it("cannot manage AI models", () => expect(can(role, "manage_ai_models")).toBe(false));
    it("cannot manage selling accounts", () => expect(can(role, "manage_selling_accounts")).toBe(false));
    it("cannot manage employees", () => expect(can(role, "manage_employee")).toBe(false));
    it("cannot manage managers", () => expect(can(role, "manage_manager")).toBe(false));
    it("cannot view all stats", () => expect(can(role, "view_all_stats")).toBe(false));
    it("cannot create production request", () => expect(can(role, "create_production_request")).toBe(false));
    it("cannot change fulfillment type", () => expect(can(role, "change_fulfillment_type")).toBe(false));
    it("can create production layout", () => expect(can(role, "create_production_layout")).toBe(true));
    it("cannot manage production layouts (edit/delete)", () => expect(can(role, "manage_production_layouts")).toBe(false));
  });

  describe("manager", () => {
    const role: Role = "manager";

    it("can approve ideas", () => expect(can(role, "approve_idea")).toBe(true));
    it("can delete any idea", () => expect(can(role, "delete_any_idea")).toBe(true));
    it("can assign photo task", () => expect(can(role, "assign_photo_task")).toBe(true));
    it("can approve photos", () => expect(can(role, "approve_photos")).toBe(true));
    it("can manage topics", () => expect(can(role, "manage_topics")).toBe(true));
    it("can manage AI models", () => expect(can(role, "manage_ai_models")).toBe(true));
    it("can manage selling accounts", () => expect(can(role, "manage_selling_accounts")).toBe(true));
    it("can manage employees", () => expect(can(role, "manage_employee")).toBe(true));
    it("can view all stats", () => expect(can(role, "view_all_stats")).toBe(true));
    it("can create production request", () => expect(can(role, "create_production_request")).toBe(true));

    it("cannot manage managers", () => expect(can(role, "manage_manager")).toBe(false));
  });

  describe("worker", () => {
    const role: Role = "worker";

    it("can update production", () => expect(can(role, "update_production")).toBe(true));
    it("can manage orders", () => expect(can(role, "manage_orders")).toBe(true));
    it("can manage shipments", () => expect(can(role, "manage_shipments")).toBe(true));
    it("can verify production layout", () => expect(can(role, "verify_production_layout")).toBe(true));

    it("cannot approve ideas", () => expect(can(role, "approve_idea")).toBe(false));
    it("cannot manage production layouts", () => expect(can(role, "manage_production_layouts")).toBe(false));
    it("cannot create production layout", () => expect(can(role, "create_production_layout")).toBe(false));
  });

  describe("boss", () => {
    const role: Role = "boss";

    it("has all permissions", () => {
      const allActions = [
        "create_idea", "view_own_ideas", "view_all_ideas", "approve_idea",
        "delete_own_idea", "delete_any_idea", "assign_photo_task", "approve_photos",
        "request_photo_revision", "manage_topics", "manage_ai_models",
        "manage_selling_accounts", "manage_employee", "manage_manager",
        "view_own_stats", "view_all_stats", "create_production_request",
        "update_production", "manage_orders", "manage_shipments",
        "change_fulfillment_type", "edit_own_profile",
        "manage_production_layouts", "verify_production_layout",
        "create_production_layout",
      ] as const;

      for (const action of allActions) {
        expect(can(role, action)).toBe(true);
      }
    });
  });

  it("returns false for invalid action", () => {
    expect(can("employee", "nonexistent_action" as never)).toBe(false);
  });
});

describe("permissions — canManageUser()", () => {
  it("boss can manage manager", () => {
    expect(canManageUser("boss", "manager")).toBe(true);
  });

  it("boss can manage employee", () => {
    expect(canManageUser("boss", "employee")).toBe(true);
  });

  it("boss can manage boss", () => {
    expect(canManageUser("boss", "boss")).toBe(true);
  });

  it("manager can manage employee", () => {
    expect(canManageUser("manager", "employee")).toBe(true);
  });

  it("manager can manage worker", () => {
    expect(canManageUser("manager", "worker")).toBe(true);
  });

  it("manager cannot manage manager", () => {
    expect(canManageUser("manager", "manager")).toBe(false);
  });

  it("manager cannot manage boss", () => {
    expect(canManageUser("manager", "boss")).toBe(false);
  });

  it("employee cannot manage anyone", () => {
    expect(canManageUser("employee", "employee")).toBe(false);
    expect(canManageUser("employee", "worker")).toBe(false);
    expect(canManageUser("employee", "manager")).toBe(false);
    expect(canManageUser("employee", "boss")).toBe(false);
  });

  it("worker cannot manage anyone", () => {
    expect(canManageUser("worker", "employee")).toBe(false);
    expect(canManageUser("worker", "worker")).toBe(false);
    expect(canManageUser("worker", "manager")).toBe(false);
    expect(canManageUser("worker", "boss")).toBe(false);
  });

  it("boss can manage worker", () => {
    expect(canManageUser("boss", "worker")).toBe(true);
  });
});

describe("permissions — getRoleLabel()", () => {
  it("returns Vietnamese labels", () => {
    expect(getRoleLabel("employee")).toBe("Nhân viên");
    expect(getRoleLabel("worker")).toBe("Công nhân");
    expect(getRoleLabel("manager")).toBe("Quản lý");
    expect(getRoleLabel("boss")).toBe("Sếp");
  });
});

describe("permissions — getRoleOrder()", () => {
  it("returns correct hierarchy ordering", () => {
    const employee = getRoleOrder("employee");
    const worker = getRoleOrder("worker");
    const manager = getRoleOrder("manager");
    const boss = getRoleOrder("boss");

    expect(employee).toBeLessThan(worker);
    expect(worker).toBeLessThan(manager);
    expect(manager).toBeLessThan(boss);
  });
});
