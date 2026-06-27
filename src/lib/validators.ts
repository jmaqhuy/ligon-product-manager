import { z } from "zod";

/**
 * Shared Zod validation schemas — used by both client forms and server API routes.
 *
 * Single source of truth for validation rules across the entire app.
 */

// ── Users ──
export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có tối thiểu 8 ký tự"),
  fullName: z.string().min(1, "Tên không được để trống"),
  role: z.enum(["employee", "manager"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự"),
});

export const updateProfileSchema = z.object({
  avatarUrl: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  notificationSettings: z.record(z.string(), z.boolean()).optional(),
});

// ── Ideas ──
export const createIdeaSchema = z.object({
  autoGenerateMsku: z.boolean().optional().default(true),
  manualMsku: z.string().max(30).optional(),
  topicId: z.string().uuid("Chủ đề không hợp lệ"),
  aiModelId: z.string().uuid("AI Model không hợp lệ"),
  prompt: z.string().min(1, "Prompt không được để trống"),
  sourceLinks: z.array(z.string().url()).min(1, "Cần ít nhất 1 link nguồn").max(5, "Tối đa 5 link nguồn"),
  mainImageUrl: z.string().min(1, "Ảnh chính không được để trống"),
  fulfillmentType: z.enum(["FBA", "FBM"]).optional().default("FBM"),
  title: z.string().max(75).optional(),
  description: z.string().optional(),
  source: z.enum(["employee", "boss", "partner"]).optional(),
  partnerId: z.string().uuid().optional(),
  partnerLabel: z.string().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  thicknessMm: z.number().positive().optional(),
  material: z.string().optional(),
  bulletPoints: z.array(z.string()).max(5).optional(),
  tags: z.string().max(500).optional(),
  slugs: z.array(z.string()).max(12).optional(),
});

export const updateIdeaSchema = z.object({
  topicId: z.string().uuid().optional(),
  aiModelId: z.string().uuid().optional(),
  prompt: z.string().optional(),
  sourceLinks: z.array(z.string().url()).max(5).optional(),
  mainImageUrl: z.string().optional(),
  fulfillmentType: z.enum(["FBA", "FBM"]).optional(),
  title: z.string().max(75).optional(),
  description: z.string().optional(),
  photoStatus: z.enum([
    "not_requested", "awaiting_photos", "pending_approval",
    "revision_requested", "approved"
  ]).optional(),
  photoAssigneeId: z.string().uuid().optional(),
  photoRevisionNote: z.string().max(500).optional(),
  status: z.enum(["reviewing", "revision_requested", "approved", "rejected"]).optional(),
  version: z.number().int().positive(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  thicknessMm: z.number().positive().optional(),
  material: z.string().optional(),
  partnerId: z.string().uuid().optional().nullable(),
  partnerLabel: z.string().optional(),
});

// ── Orders ──
export const createOrderSchema = z.object({
  orderId: z.string().min(1, "Mã đơn hàng không được để trống"),
  platform: z.enum(["amazon", "etsy"]),
  sku: z.string().min(1),
  sellingAccountId: z.string().uuid(),
  customerName: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
  price: z.number().positive().optional(),
  trackingNumber: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  productionStatus: z.enum([
    "producing", "produced", "awaiting_fulfillment", "fulfilled", "ff_amz"
  ]).optional(),
  trackingUploaded: z.boolean().optional(),
  trackingNumber: z.string().optional(),
  designerId: z.string().uuid().optional(),
  producerId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
  version: z.number().int().positive().optional(),
});

// ── Production ──
export const createProductionSchema = z.object({
  ideaId: z.string().uuid(),
  priority: z.enum(["urgent", "priority", "normal"]).optional().default("normal"),
  productionType: z.enum(["batch", "sample"]).optional().default("batch"),
  requestedQty: z.number().int().positive(),
  note: z.string().max(1000).optional(),
  stepNames: z.array(z.string().min(1)).min(1, "Cần ít nhất 1 công đoạn"),
});

// ── Shipments ──
export const createShipmentSchema = z.object({
  sellingAccountId: z.string().uuid(),
  shipmentId: z.string().optional(),
  boxName: z.string().min(1, "Tên thùng không được để trống"),
  shipDate: z.string().optional(),
  trackingNumber: z.string().optional(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
});

// ── Selling Accounts ──
export const createSellingAccountSchema = z.object({
  platform: z.enum(["amazon", "etsy"]),
  name: z.string().min(1, "Tên tài khoản không được để trống"),
});

// ── Batch Operations ──
export const batchOperationSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Chọn ít nhất 1 ý tưởng"),
  action: z.enum(["approve", "request_photos", "request_file", "change_topic", "delete"]),
  topicId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

// ── Type exports ──
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type CreateSellingAccountInput = z.infer<typeof createSellingAccountSchema>;
export type BatchOperationInput = z.infer<typeof batchOperationSchema>;
