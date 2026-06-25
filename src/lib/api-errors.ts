import { NextResponse } from "next/server";

export interface AppErrorPayload {
  error: string;
  details?: string[];
  action?: {
    label: string;
    url: string;
  };
}

/**
 * Lỗi tuỳ chỉnh dùng cho các nghiệp vụ cụ thể.
 * Bạn có thể ném (throw) lỗi này ở bất kỳ đâu trong quá trình xử lý logic Backend.
 */
export class BusinessError extends Error {
  public details?: string[];
  public action?: { label: string; url: string };
  public statusCode: number;

  constructor(
    message: string,
    options?: { details?: string[]; action?: { label: string; url: string }; statusCode?: number }
  ) {
    super(message);
    this.name = "BusinessError";
    this.details = options?.details;
    this.action = options?.action;
    this.statusCode = options?.statusCode || 400;
  }
}

/**
 * Xử lý tập trung các Exception và chuyển đổi thành NextResponse chứa định dạng lỗi chuẩn.
 */
export function handleApiError(error: unknown) {
  // 1. Nếu là lỗi nghiệp vụ do dev chủ động throw
  if (error instanceof BusinessError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        action: error.action,
      } as AppErrorPayload,
      { status: error.statusCode }
    );
  }

  // 2. Nếu là lỗi Prisma (Ví dụ P2003, P2002)
  const errStr = String(error);
  if (errStr.includes("P2003") || errStr.includes("Foreign key constraint violated")) {
    return NextResponse.json(
      {
        error: "Không thể thao tác.",
        details: ["Dữ liệu này đang được liên kết với một thành phần khác trong hệ thống."],
      } as AppErrorPayload,
      { status: 403 }
    );
  }
  
  if (errStr.includes("P2002") || errStr.includes("Unique constraint failed")) {
    return NextResponse.json(
      {
        error: "Dữ liệu bị trùng lặp.",
        details: ["Thông tin bạn nhập đã tồn tại trong hệ thống. Vui lòng kiểm tra lại."],
      } as AppErrorPayload,
      { status: 400 }
    );
  }

  // 3. Lỗi xác thực JWT/Session
  if (errStr.includes("Unauthorized") || errStr.includes("JWT")) {
    return NextResponse.json(
      { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." },
      { status: 401 }
    );
  }

  // 4. Lỗi hệ thống không lường trước
  console.error("Unhandled API Error:", error);
  return NextResponse.json(
    {
      error: "Hệ thống đang gặp sự cố.",
      details: ["Vui lòng thử lại sau hoặc liên hệ quản trị viên."],
    } as AppErrorPayload,
    { status: 500 }
  );
}
