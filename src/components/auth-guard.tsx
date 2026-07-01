"use client";

import React, { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();

  const lastPathname = React.useRef(pathname);

  // Bắt buộc refetch session mỗi khi người dùng chuyển trang
  useEffect(() => {
    if (pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      update();
    }
  }, [pathname, update]);

  // Kiểm tra cờ lỗi từ backend hoặc mất id
  useEffect(() => {
    // Ép kiểu để Typescript không báo lỗi vì error là custom property
    const sessionData = session as any;
    if (status === "authenticated" && (sessionData?.error === "UserNotFound" || !sessionData?.user?.id)) {
      signOut({ callbackUrl: "/login" });
    }
  }, [session, status]);

  return <>{children}</>;
}
