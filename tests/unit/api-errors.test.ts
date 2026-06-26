import { describe, it, expect } from "vitest";
import { BusinessError, handleApiError } from "@/lib/api-errors";

describe("BusinessError", () => {
  it("creates error with default status code 400", () => {
    const err = new BusinessError("Test error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BusinessError);
    expect(err.name).toBe("BusinessError");
    expect(err.message).toBe("Test error");
    expect(err.statusCode).toBe(400);
    expect(err.details).toBeUndefined();
    expect(err.action).toBeUndefined();
  });

  it("creates error with custom status code", () => {
    const err = new BusinessError("Forbidden", { statusCode: 403 });
    expect(err.statusCode).toBe(403);
  });

  it("creates error with details array", () => {
    const err = new BusinessError("Validation failed", {
      details: ["Email is required", "Password too short"],
    });
    expect(err.details).toEqual(["Email is required", "Password too short"]);
  });

  it("creates error with action link", () => {
    const err = new BusinessError("Need setup", {
      action: { label: "Go to settings", url: "/settings" },
    });
    expect(err.action).toEqual({ label: "Go to settings", url: "/settings" });
  });
});

describe("handleApiError", () => {
  it("returns 400 for BusinessError with default status", async () => {
    const response = handleApiError(new BusinessError("Bad request"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Bad request");
  });

  it("returns custom status code from BusinessError", async () => {
    const response = handleApiError(new BusinessError("Not found", { statusCode: 404 }));
    expect(response.status).toBe(404);
  });

  it("returns details from BusinessError", async () => {
    const response = handleApiError(
      new BusinessError("Error", { details: ["Detail 1", "Detail 2"] })
    );
    const body = await response.json();
    expect(body.details).toEqual(["Detail 1", "Detail 2"]);
  });

  it("returns action from BusinessError", async () => {
    const response = handleApiError(
      new BusinessError("Error", {
        action: { label: "Fix", url: "/fix" },
      })
    );
    const body = await response.json();
    expect(body.action).toEqual({ label: "Fix", url: "/fix" });
  });

  it("handles Prisma P2002 (unique constraint)", async () => {
    const prismaError = new Error(
      "Unique constraint failed on the fields: (`email`)"
    );
    // Simulate Prisma error string
    const fakePrismaErr = "P2002: Unique constraint failed";
    const response = handleApiError(fakePrismaErr);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dữ liệu bị trùng lặp.");
    expect(body.details).toBeDefined();
  });

  it("handles Prisma P2003 (foreign key)", async () => {
    const response = handleApiError("P2003: Foreign key constraint violated");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Không thể thao tác.");
  });

  it("handles JWT/Unauthorized errors", async () => {
    const response = handleApiError("Unauthorized: JWT expired");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  });

  it("handles unknown errors with 500 status", async () => {
    const response = handleApiError(new Error("Something unexpected"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });

  it("handles string errors", async () => {
    const response = handleApiError("plain string error");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
