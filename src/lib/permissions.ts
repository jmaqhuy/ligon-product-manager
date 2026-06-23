// RBAC Permissions for Ligon Team
// 3 roles: employee < manager < boss

export type Role = "employee" | "manager" | "boss";

export type Action =
  | "create_idea"
  | "view_own_ideas"
  | "view_all_ideas"
  | "approve_idea"
  | "delete_own_idea"
  | "delete_any_idea"
  | "assign_photo_task"
  | "approve_photos"
  | "request_photo_revision"
  | "manage_topics"
  | "manage_ai_models"
  | "manage_selling_accounts"
  | "manage_employee"
  | "manage_manager"
  | "view_own_stats"
  | "view_all_stats"
  | "create_production_request"
  | "update_production"
  | "manage_orders"
  | "manage_shipments"
  | "change_fulfillment_type"
  | "edit_own_profile";

const PERMISSIONS: Record<Action, Role[]> = {
  create_idea: ["employee", "manager", "boss"],
  view_own_ideas: ["employee", "manager", "boss"],
  view_all_ideas: ["employee", "manager", "boss"],
  approve_idea: ["manager", "boss"],
  delete_own_idea: ["employee", "manager", "boss"],
  delete_any_idea: ["manager", "boss"],
  assign_photo_task: ["manager", "boss"],
  approve_photos: ["manager", "boss"],
  request_photo_revision: ["manager", "boss"],
  manage_topics: ["manager", "boss"],
  manage_ai_models: ["manager", "boss"],
  manage_selling_accounts: ["manager", "boss"],
  manage_employee: ["manager", "boss"],
  manage_manager: ["boss"],
  view_own_stats: ["employee", "manager", "boss"],
  view_all_stats: ["manager", "boss"],
  create_production_request: ["manager", "boss"],
  update_production: ["employee", "manager", "boss"],
  manage_orders: ["employee", "manager", "boss"],
  manage_shipments: ["employee", "manager", "boss"],
  change_fulfillment_type: ["manager", "boss"],
  edit_own_profile: ["employee", "manager", "boss"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "boss") return true;
  if (actorRole === "manager" && targetRole === "employee") return true;
  return false;
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    employee: "Nhân viên",
    manager: "Quản lý",
    boss: "Sếp",
  };
  return labels[role] || role;
}

export function getRoleOrder(role: Role): number {
  const order: Record<Role, number> = {
    employee: 0,
    manager: 1,
    boss: 2,
  };
  return order[role] ?? 0;
}
