import { toast } from "sonner";
import { AppErrorPayload } from "./api-errors";

type FetchOptions = RequestInit & {
  successMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
};

/**
 * Hàm bao bọc fetch mặc định, tự động parse JSON và xử lý lỗi (hiển thị Actionable Toasts).
 */
export async function apiFetch<T = any>(url: string, options: FetchOptions = {}): Promise<{ data: T | null; error: string | null }> {
  const { successMessage, onSuccess, onError, ...fetchInit } = options;

  try {
    const res = await fetch(url, fetchInit);

    if (!res.ok) {
      let payload: AppErrorPayload | null = null;
      try {
        payload = await res.json();
      } catch (e) {
        // Lỗi không phải JSON (VD: 502 Bad Gateway)
      }

      const errorMessage = payload?.error || (
        res.status === 401 ? "Phiên đăng nhập đã hết hạn." :
        res.status === 403 ? "Bạn không có quyền thực hiện thao tác này." :
        res.status === 404 ? "Không tìm thấy dữ liệu." :
        res.status >= 500 ? "Hệ thống đang gặp sự cố, vui lòng thử lại sau." :
        "Đã xảy ra lỗi không xác định."
      );

      // Nếu API trả về Actionable Error
      if (payload?.action || (payload?.details && payload.details.length > 0)) {
        toast.error(errorMessage, {
          description: payload.details?.join("\n"),
          duration: payload.action ? Infinity : undefined, // Không tự tắt nếu có Action
          action: payload.action ? {
            label: payload.action.label,
            onClick: () => {
              // Xử lý chuyển hướng nếu url là link nội bộ
              if (payload!.action!.url.startsWith("/")) {
                window.location.href = payload!.action!.url; // Dùng window.location vì ngoài phạm vi component
              } else {
                window.open(payload!.action!.url, "_blank");
              }
            }
          } : undefined,
        });
      } else {
        // Lỗi thông thường
        toast.error(errorMessage);
      }

      if (onError) onError(errorMessage);
      return { data: null, error: errorMessage };
    }

    // Thành công
    if (res.status === 204) {
      if (successMessage) toast.success(successMessage);
      if (onSuccess) onSuccess(true);
      return { data: true as any, error: null };
    }

    const data = await res.json();
    if (successMessage) toast.success(successMessage);
    if (onSuccess) onSuccess(data);
    return { data, error: null };

  } catch (err: any) {
    const isNetworkError = !err.response && err.message?.includes("fetch");
    const msg = isNetworkError ? "Mất kết nối mạng, vui lòng kiểm tra lại đường truyền." : "Lỗi không xác định. Vui lòng thử lại.";
    toast.error(msg);
    if (onError) onError(msg);
    return { data: null, error: msg };
  }
}
