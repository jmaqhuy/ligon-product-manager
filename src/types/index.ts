import type { Role } from "@/lib/permissions";

// Idea statuses
export const IDEA_STATUSES = ["reviewing", "approved", "published", "rejected"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_TABS = ["all", "reviewing", "photos", "ready", "published", "rejected"] as const;
export type IdeaTab = (typeof IDEA_TABS)[number];

export const PHOTO_STATUSES = [
  "not_requested",
  "awaiting_photos",
  "pending_approval",
  "revision_requested",
  "approved",
] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

export const FILE_STATUSES = [
  "not_started",
  "in_progress",
  "pending_review",
  "approved",
  "revision_requested",
] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

export const FULFILLMENT_TYPES = ["FBA", "FBM"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const LISTING_STATUSES = [
  "ready",
  "uploaded",
  "selling",
  "error",
  "fixed",
  "delisted",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const PRODUCTION_PRIORITIES = ["urgent", "priority", "normal"] as const;
export type ProductionPriority = (typeof PRODUCTION_PRIORITIES)[number];

export const PRODUCTION_TYPES = ["batch", "sample"] as const;
export type ProductionType = (typeof PRODUCTION_TYPES)[number];

export const ORDER_PRODUCTION_STATUSES = [
  "producing",
  "produced",
  "awaiting_fulfillment",
  "fulfilled",
  "ff_amz",
] as const;
export type OrderProductionStatus = (typeof ORDER_PRODUCTION_STATUSES)[number];

export const PLATFORMS = ["amazon", "etsy"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const NOTIFICATION_CATEGORIES = [
  "photo",
  "production_file",
  "processing_file",
  "general",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// Status label mappings (Vietnamese)
export const ideaStatusLabels: Record<IdeaStatus, string> = {
  reviewing: "Đang xem xét",
  approved: "Đã được duyệt",
  published: "Đã đăng bán",
  rejected: "Đã bị từ chối",
};

export const photoStatusLabels: Record<PhotoStatus, string> = {
  not_requested: "Chưa yêu cầu",
  awaiting_photos: "Đang chờ làm ảnh",
  pending_approval: "Chờ duyệt ảnh",
  revision_requested: "Yêu cầu làm lại",
  approved: "Đã duyệt ảnh",
};

export const fileStatusLabels: Record<FileStatus, string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang làm",
  pending_review: "Chờ duyệt file",
  approved: "Đã duyệt file",
  revision_requested: "Yêu cầu chỉnh sửa",
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  ready: "Sẵn sàng",
  uploaded: "Đã up",
  selling: "Đang bán",
  error: "Lỗi",
  fixed: "Đã sửa",
  delisted: "Bị sàn gỡ",
};

export const productionPriorityLabels: Record<ProductionPriority, string> = {
  urgent: "Khẩn cấp",
  priority: "Ưu tiên",
  normal: "Bình thường",
};

export const orderProductionStatusLabels: Record<OrderProductionStatus, string> = {
  producing: "Đang sản xuất",
  produced: "Đã sản xuất",
  awaiting_fulfillment: "Chờ Fulfillment",
  fulfilled: "Đã Fulfillment",
  ff_amz: "FF Amazon",
};

export const roleLabels: Record<Role, string> = {
  employee: "Nhân viên",
  manager: "Quản lý",
  boss: "Sếp",
};
