"use client";

import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "./providers/socket-provider";
import { QueryProvider } from "./providers/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
