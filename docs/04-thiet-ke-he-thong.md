# 04. Thiết kế hệ thống (System Design)

## 1. Kiến trúc tổng thể

```mermaid
graph TD
    subgraph Client["Trình duyệt"]
        UI["Next.js Client Components<br/>(shadcn/ui + Tailwind)"]
    end

    subgraph Server["Next.js Server (Node.js, deploy trên Vercel)"]
        SA["Server Actions / Route Handlers"]
        AUTH["Auth.js<br/>(session + RBAC middleware)"]
        SSE["SSE endpoint<br/>(thông báo realtime)"]
    end

    DB[("PostgreSQL<br/>(Neon/Supabase) qua Prisma ORM")]
    DRIVE["Google Drive<br/>(chỉ lưu link, không upload qua app)"]

    UI -->|"gọi Server Action / fetch API"| SA
    UI -->|"đăng nhập"| AUTH
    UI <-->|"nhận thông báo mới"| SSE
    SA --> AUTH
    SA --> DB
    SA -.->|"convert link xem trước<br/>(không upload/download file)"| DRIVE
```

**Lý do thiết kế:** team nhỏ, ưu tiên đơn giản — gộp frontend + backend trong 1 Next.js app, không tách microservice. Google Drive chỉ đóng vai trò "kho lưu trữ ngoài", app không cần quyền ghi vào Drive (nhân viên tự upload thủ công và dán link vào app).

## 2. Lược đồ cơ sở dữ liệu (ERD)

```mermaid
erDiagram
    USERS ||--o{ IDEAS : "tạo ra"
    USERS ||--o{ SELLING_ACCOUNTS : "thêm vào"
    USERS ||--o{ NOTIFICATIONS : "nhận"
    USERS ||--o{ AUDIT_LOGS : "thực hiện thay đổi"

    PRODUCT_TOPICS ||--o{ IDEAS : "phân loại"
    AI_MODELS ||--o{ IDEAS : "tạo bằng"

    IDEAS ||--o| AMAZON_LISTINGS : "có thông tin"
    IDEAS ||--o| ETSY_LISTINGS : "có thông tin"
    IDEAS ||--o{ PRODUCTION_REQUESTS : "yêu cầu sản xuất"
    IDEAS ||--o{ SHIPMENT_BOX_ITEMS : "nằm trong thùng"

    SELLING_ACCOUNTS ||--o{ AMAZON_LISTINGS : "đăng trên"
    SELLING_ACCOUNTS ||--o{ ETSY_LISTINGS : "đăng trên"
    SELLING_ACCOUNTS ||--o{ ORDERS : "thuộc tài khoản"
    SELLING_ACCOUNTS ||--o{ SHIPMENT_BOXES : "thuộc tài khoản"

    PRODUCTION_REQUESTS ||--o{ PRODUCTION_STEPS : "gồm các công đoạn"

    SHIPMENT_BOXES ||--o{ SHIPMENT_BOX_ITEMS : "chứa"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string name_abbreviation
        enum role
        enum status
        date start_date
    }

    IDEAS {
        uuid id PK
        string sku
        string msku UK
        uuid created_by FK
        uuid topic_id FK
        uuid ai_model_id FK
        string main_image_url
        enum status
        enum photo_status
        uuid photo_assignee FK
        enum fulfillment_type
        string production_file_url
        datetime created_at
    }

    AMAZON_LISTINGS {
        uuid id PK
        uuid idea_id FK
        uuid selling_account_id FK
        string asin
        string fnsku_code
        string item_name
        string item_highlights
        enum listing_status
    }

    ETSY_LISTINGS {
        uuid id PK
        uuid idea_id FK
        uuid selling_account_id FK
        string listing_id
        string title
        enum listing_status
    }

    SELLING_ACCOUNTS {
        uuid id PK
        enum platform
        string name
        enum status
        uuid created_by FK
    }

    PRODUCTION_REQUESTS {
        uuid id PK
        uuid idea_id FK
        enum priority
        int requested_qty
        int actual_qty
        datetime requested_at
        datetime completed_at
    }

    PRODUCTION_STEPS {
        uuid id PK
        uuid production_request_id FK
        string step_name
        int sequence_order
        string performed_by
        datetime started_at
        datetime finished_at
    }

    ORDERS {
        uuid id PK
        enum platform
        string order_id
        string sku
        uuid selling_account_id FK
        uuid designer FK
        uuid producer FK
        boolean tracking_uploaded
        enum production_status
    }

    SHIPMENT_BOXES {
        uuid id PK
        uuid amazon_account_id FK
        date ship_date
        string shipment_id
        string box_name
        string tracking_number
    }

    SHIPMENT_BOX_ITEMS {
        uuid id PK
        uuid shipment_box_id FK
        uuid idea_id FK
        int qty_per_box
        int total_box_count
    }

    PRODUCT_TOPICS {
        uuid id PK
        string name
    }

    AI_MODELS {
        uuid id PK
        string name
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string type
        string message
        string action_url
        boolean is_read
    }

    AUDIT_LOGS {
        uuid id PK
        string entity_type
        uuid entity_id
        string field_name
        string old_value
        string new_value
        uuid changed_by FK
        datetime changed_at
    }
```

> Ghi chú: `ORDERS.sku` tham chiếu lỏng (không phải FK cứng) tới `IDEAS.sku`/`IDEAS.msku`, vì 1 đơn hàng có thể được tạo trước khi có đầy đủ thông tin idea liên kết, hoặc SKU trên sàn có thể bị nhân viên sửa tay khác với hệ thống — xử lý bằng cách tra cứu lúc hiển thị (lookup), không ràng buộc khoá ngoại cứng để tránh chặn nhập liệu khi dữ liệu chưa khớp 100%. *(⚠️ CẦN LÀM RÕ với đội dev: nếu muốn ràng buộc chặt hơn, có thể đổi sang FK thật ở bản sau khi quy trình ổn định.)*

> `AUDIT_LOGS` thiết kế dạng polymorphic (entity_type + entity_id) để dùng chung cho mọi bảng cần lịch sử sửa đổi (ideas, amazon_listings, etsy_listings, orders...), thay vì tạo bảng log riêng cho từng bảng.

## 3. Thiết kế API (Server Actions / Route Handlers)

Quy ước: dùng **Server Actions** cho thao tác CRUD nội bộ (gắn trực tiếp với form), dùng **Route Handlers** (`/api/...`) cho các điểm cần gọi từ client component động (bảng có phân trang/lọc/sắp xếp) hoặc dự phòng tích hợp bên ngoài sau này.

| Nhóm | Endpoint / Action | Mô tả |
|---|---|---|
| Auth | `POST /api/auth/[...nextauth]` | Đăng nhập/đăng xuất qua Auth.js |
| Users | `GET /api/users`, `createUser()`, `updateUser()`, `deactivateUser()` | CRUD tài khoản, có kiểm tra phân quyền theo role |
| Ideas | `GET /api/ideas` (filter/sort/search), `createIdea()`, `updateIdea()`, `deleteIdea()`, `approveIdea()`, `requestRevision()` | |
| Idea — Photo flow | `assignPhotoTask()`, `submitPhotos()`, `requestPhotoRevision()`, `approvePhotos()` | Chuyển `photo_status` theo state machine ở Module 2 |
| Amazon/Etsy listing | `upsertAmazonListing()`, `upsertEtsyListing()` | 1 idea — 1 bản ghi mỗi sàn |
| Selling accounts | `GET /api/selling-accounts`, `createSellingAccount()`, `deactivateSellingAccount()` | Không có `deleteSellingAccount()` |
| Production | `GET /api/production-requests`, `createProductionRequest()`, `addProductionStep()`, `startStep()`, `finishStep()` | |
| Orders | `GET /api/orders` (filter/sort/search), `createOrder()`, `updateOrder()`, `toggleTrackingUploaded()` | |
| Shipments | `GET /api/shipments`, `createShipmentBox()`, `addBoxItem()` | Tự tính inch/lb, tự tính `total_qty` |
| Notifications | `GET /api/notifications`, `markAsRead()`, SSE `GET /api/notifications/stream` | |
| Dashboard | `GET /api/dashboard/employee-stats`, `GET /api/dashboard/source-link-stats` | Áp phân quyền theo role ngay trong query |

**Quy ước response lỗi:** mọi action trả về dạng `{ success: boolean, data?, error?: { code, message } }` để client (React Hook Form) hiển thị lỗi field cụ thể khi cần.

## 4. Luồng dữ liệu chính (Sequence Diagrams)

### 4.1 Luồng duyệt ý tưởng → làm ảnh → đăng bán

```mermaid
sequenceDiagram
    actor NV as Nhân viên
    actor QL as Quản lý/Sếp
    participant SYS as Hệ thống

    NV->>SYS: Tạo ý tưởng (1 ảnh main bắt buộc)
    SYS-->>QL: Thông báo "Có ý tưởng mới cần duyệt"
    QL->>SYS: Duyệt ý tưởng
    SYS-->>NV: Thông báo "Ý tưởng đã được duyệt"
    QL->>SYS: Yêu cầu gen ảnh AI / chụp mẫu (giao cho NV)
    SYS-->>NV: Thông báo "Bạn được giao làm ảnh"
    NV->>SYS: Nộp bộ ảnh (main + gallery)
    SYS-->>QL: Thông báo "Có ảnh cần duyệt"
    alt Ảnh chưa đạt
        QL->>SYS: Yêu cầu làm lại (kèm lý do)
        SYS-->>NV: Thông báo kèm lý do
        NV->>SYS: Nộp lại bộ ảnh mới
    else Ảnh đạt
        QL->>SYS: Duyệt ảnh
        SYS-->>NV: Thông báo "Sẵn sàng đăng bán"
    end
    NV->>SYS: Nhập thông tin đăng bán Amazon/Etsy, đánh dấu "đã up"
    NV->>SYS: Cập nhật ASIN/FNSKU/listing ID (do sàn trả về, nhập tay)
```

### 4.2 Luồng tạo yêu cầu sản xuất (hàng FBA)

```mermaid
sequenceDiagram
    actor QL as Quản lý
    actor TX as Thợ xưởng
    participant SYS as Hệ thống

    QL->>SYS: Tạo yêu cầu sản xuất (chọn idea, số lượng, mức ưu tiên)
    SYS->>SYS: Sinh danh sách công đoạn theo sản phẩm
    QL->>SYS: Thiết lập thứ tự công đoạn (VD: Cắt → In)
    TX->>SYS: Chọn tên mình (dropdown) + bấm "Bắt đầu" công đoạn Cắt
    TX->>SYS: Bấm "Hoàn tất" công đoạn Cắt
    TX->>SYS: Chọn tên + "Bắt đầu"/"Hoàn tất" công đoạn In
    TX->>SYS: Đánh dấu "Hoàn tất" toàn bộ (đóng thùng)
    SYS-->>QL: Thông báo "Đã sản xuất xong, sẵn sàng đóng shipment"
```

## 5. Phân quyền (RBAC) — cách triển khai

- 3 role cố định (`employee`, `manager`, `boss`) — **không cần bảng permissions động trong DB** vì số lượng role/chức năng cố định và ít thay đổi; định nghĩa bảng phân quyền (Module 1, mục 1.4 trong FRD) trực tiếp trong code (`lib/permissions.ts`) dưới dạng object tra cứu `can(role, action)`.
- Áp dụng kiểm tra quyền ở **2 lớp**:
  1. UI: ẩn/khoá control không phù hợp quyền (trải nghiệm tốt hơn).
  2. Server Action/API: luôn kiểm tra lại quyền trước khi thực thi — **không tin tưởng dữ liệu từ client**, vì lớp UI có thể bị bypass.
- Helper gợi ý:
```ts
// lib/permissions.ts
export function can(role: Role, action: Action): boolean { /* tra bảng */ }

// Dùng trong Server Action
export async function deactivateUser(targetUserId: string) {
  const session = await auth();
  if (!can(session.user.role, "deactivate_user")) throw new ForbiddenError();
  // kiểm tra thêm: Quản lý không được đụng tài khoản role = boss
  ...
}
```

## 6. Bảo mật

| Hạng mục | Biện pháp |
|---|---|
| Mật khẩu | Hash bằng bcrypt/argon2, không bao giờ trả password_hash về client |
| Session | Auth.js JWT/DB session, cookie `httpOnly`, `secure`, `sameSite=lax` |
| Input validation | Zod schema dùng chung client/server cho mọi form |
| Brute-force đăng nhập | Giới hạn số lần đăng nhập sai (rate limit theo email/IP) |
| Phân quyền | Kiểm tra ở tầng Server Action như mục 5, không chỉ ở UI |
| Audit log | Không cho sửa/xoá bản ghi `audit_logs` qua bất kỳ API nào (chỉ insert) |

## 7. Xử lý đồng thời nhiều người dùng (Concurrency)

Vì nhiều người có thể cùng sửa 1 ý tưởng/đơn hàng cùng lúc:
- Thêm cột `updated_at`/`version` cho các bảng hay bị sửa đồng thời (`ideas`, `orders`, `production_requests`).
- Khi submit form sửa, gửi kèm `version` đã tải về; nếu `version` ở server đã khác → từ chối lưu, yêu cầu tải lại dữ liệu mới nhất (tránh ghi đè âm thầm — *optimistic locking*).

## 8. Tích hợp Google Drive (link-only, không upload)

- App **không** gọi Google Drive API để upload/download file ở MVP — nhân viên tự upload thủ công lên Drive, dán link vào form.
- Helper `lib/google-drive.ts` chỉ làm 1 việc: nhận diện link dạng `drive.google.com/file/d/{id}/...` và convert sang `lh3.googleusercontent.com/d/{id}` để `<img>`/preview hiển thị được; KHÔNG sửa giá trị gốc lưu trong DB.
