# 02. Công nghệ sử dụng

## 1. Tổng quan stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Ngôn ngữ | TypeScript | Type-safety xuyên suốt frontend/backend, giảm lỗi khi field nhiều như dự án này. |
| Framework | **Next.js** (App Router) | Chạy trên Node.js theo đúng yêu cầu ban đầu; gộp được frontend + API routes/Server Actions trong 1 repo, dễ triển khai. |
| UI Components | **shadcn/ui** (preset `b1D0dv72`) | Đã chốt theo yêu cầu ban đầu — toàn bộ component lấy từ shadcn/ui. |
| CSS | Tailwind CSS | Đi kèm bắt buộc với shadcn/ui. |
| Icon | **lucide-react** | Đã chốt theo yêu cầu ban đầu. |
| Database | **PostgreSQL** | Phù hợp dữ liệu quan hệ nhiều bảng (ý tưởng, đơn hàng, sản xuất, shipment...) và cần transaction khi cập nhật trạng thái. |
| ORM | **Prisma** | Migration rõ ràng, type-safe query, sinh types tự động cho TypeScript. |
| Xác thực | **Auth.js (NextAuth v5)** | Đăng nhập bằng Email + mật khẩu (Credentials provider), session lưu JWT hoặc DB session. |
| Lưu trữ file | **Google Drive** (liên kết, không upload trực tiếp) | Đúng yêu cầu: ảnh/file sản xuất lưu trên Drive, app chỉ lưu link. |
| Thông báo realtime trong app | **Server-Sent Events (SSE)** hoặc polling ngắn (5–10s) | Đủ dùng cho quy mô công ty nhỏ, không cần WebSocket/queue phức tạp. *(⚠️ cần xác nhận thêm — xem mục 5)* |
| Validation | **Zod** | Validate cả phía client (form) lẫn server (API/Server Actions) dùng chung 1 schema. |
| Form | **React Hook Form** + Zod resolver | Chuẩn kết hợp phổ biến với shadcn/ui form components. |
| Triển khai (hosting) | **Vercel** | Deploy Next.js gần như zero-config, có preview deployment cho mỗi PR. |
| Database hosting | **Neon** hoặc **Supabase** (Postgres serverless) | Free tier đủ dùng giai đoạn đầu, scale dễ, tích hợp tốt với Vercel. |

> *(✏️ Đây là đề xuất stack cụ thể hoá từ phần "Công nghệ sử dụng" trong `software-description.md`, dựa trên yêu cầu gốc Node.js + shadcn/ui + lucide + Google Drive. Có thể đổi nếu đội dev có công nghệ quen thuộc hơn.)*

## 2. Vì sao chọn Next.js thay vì Node.js thuần (Express/Fastify)

- Yêu cầu gốc chỉ ghi "Node.js" — Next.js **chạy trên Node.js**, đáp ứng đúng yêu cầu, đồng thời cho 1 repo duy nhất (không cần tách backend/frontend riêng), giảm chi phí vận hành cho team nhỏ.
- shadcn/ui được thiết kế tối ưu cho Next.js + Tailwind — khớp với lựa chọn UI đã chốt.
- Next.js Server Actions phù hợp với nhiều form nhập liệu nhiều field (tạo ý tưởng, tạo đơn hàng, tạo shipment...) mà không cần viết REST API thủ công cho từng thao tác CRUD nội bộ.
- Nếu sau này cần mở thêm API riêng cho bên thứ 3 (ví dụ Amazon SP-API callback), vẫn dùng được Next.js Route Handlers (`app/api/.../route.ts`) như 1 REST API bình thường.

## 3. Cấu trúc thư mục đề xuất

```
app/
  (auth)/
    login/
  (dashboard)/
    dashboard/                # Dashboard/Thống kê
    ideas/                    # Quản lý ý tưởng
      [id]/
    production/                # Quản lý quá trình sản xuất
    orders/                    # Quản lý đơn hàng
    shipments/                 # Quản lý shipment
    accounts/                  # Quản lý tài khoản (người dùng)
    selling-accounts/          # Quản lý tài khoản đăng bán (Amazon/Etsy)
    notifications/
    tools/                      # Danh mục tool (placeholder)
  api/
    webhooks/                  # Dự phòng cho Phase 2 (Amazon/Etsy)
components/
  ui/                          # shadcn/ui components
  forms/
  tables/
  charts/
lib/
  auth.ts                      # cấu hình Auth.js
  db.ts                        # Prisma client
  permissions.ts                # Hàm kiểm tra phân quyền (RBAC)
  google-drive.ts               # Helper chuyển link Drive sang link xem trực tiếp
  validators/                   # Zod schemas dùng chung client + server
prisma/
  schema.prisma
  migrations/
```

## 4. Biến môi trường (.env) cần thiết

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL (Neon/Supabase). |
| `AUTH_SECRET` | Khóa ký JWT/session của Auth.js. |
| `NEXTAUTH_URL` | URL gốc của ứng dụng (cho callback đăng nhập). |
| `GOOGLE_DRIVE_API_KEY` *(tùy chọn)* | Nếu cần gọi Google Drive API để kiểm tra link tồn tại; nếu chỉ lưu link thuần thì không bắt buộc. |

## 5. Các điểm cần xác nhận thêm trước khi code

- *(⚠️ CẦN LÀM RÕ)* Cơ chế thông báo real-time: SSE/polling đơn giản có đủ không, hay cần độ trễ gần như tức thời (lúc đó cân nhắc Pusher/Ably hoặc WebSocket riêng)?
- *(⚠️ CẦN LÀM RÕ)* Có cần môi trường staging riêng trước khi lên production không, hay deploy thẳng production (phù hợp team nhỏ, ít rủi ro)?
- *(⚠️ CẦN LÀM RÕ)* Ai là người giữ Google Drive (tài khoản tổ chức hay cá nhân) — ảnh hưởng tới việc link Drive có ổn định lâu dài không (nhân viên nghỉ việc thì link có mất không).

## 6. Testing & chất lượng (đề xuất tối thiểu cho team nhỏ)

- **ESLint + Prettier**: bắt lỗi style/code cơ bản.
- **Zod schema dùng chung**: giảm bug do validate lệch giữa client/server.
- Chưa đề xuất unit test/CI đầy đủ ở MVP — ưu tiên tốc độ ra sản phẩm cho team nhỏ; có thể bổ sung khi hệ thống ổn định.
