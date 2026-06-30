"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export type OnlineUser = {
  id: string;
  fullName: string;
  nameAbbreviation: string;
  avatarUrl: string | null;
  currentPath: string;
};

type SocketContextType = {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  notifications: any[];
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  unreadCount: 0,
  setUnreadCount: () => {},
  notifications: [],
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
          setNotifications(data.notifications || []);
        }
      } catch (e) {}
    };
    if (session?.user) {
      fetchUnread();
    }
    const interval = setInterval(() => {
      if (session?.user) fetchUnread();
    }, 15000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const socketInstance = io(); // Connects to the same host/port automatically

    socketInstance.on("connect", () => {
      console.log("Connected to socket server");
      if (session?.user) {
        socketInstance.emit("join", {
          id: session.user.id,
          fullName: session.user.fullName,
          nameAbbreviation: session.user.nameAbbreviation,
          avatarUrl: session.user.avatarUrl,
          currentPath: pathname,
        });
      }
    });

    socketInstance.on("online_users", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    // Handle incoming notifications globally
    socketInstance.on("new_notification", (data: any) => {
      if (session?.user && (!data.userIds || data.userIds.includes(session.user.id))) {
        // Ignore internal sync events
        if (data.type === "idea_detail_updated") return;

        // Only show if the settings allow it
        try {
          const settings = session.user.notificationSettings 
            ? JSON.parse(session.user.notificationSettings) 
            : { new_idea: true, idea_approved: true, idea_rejected: true, photo_requested: true };
          
          let title = "Thông báo mới";
          let typeToKey: Record<string, string> = {
            "new_idea": "new_idea",
            "idea_approved": "idea_approved",
            "idea_rejected": "idea_rejected",
            "idea_revision_requested": "idea_rejected",
            "photo_requested": "photo_requested",
            "idea_updated": "idea_approved"
          };
          
          const key = typeToKey[data.type];
          // If enabled or not configured, show
          if (!key || settings[key] !== false) {
            toast(title, {
              description: data.message,
              duration: 7000,
              action: data.actionUrl ? {
                label: "Xem",
                onClick: () => window.open(data.actionUrl, '_blank')
              } : undefined
            });
          }
        } catch (e) {
          toast("Thông báo", { description: data.message, duration: 7000 });
        }
        
        // Optimistically increment unread count
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [data, ...prev].slice(0, 5));

      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  // Update current path when route changes
  useEffect(() => {
    if (socket && session?.user) {
      socket.emit("view_page", pathname);
    }
  }, [pathname, socket, session]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, unreadCount, setUnreadCount, notifications }}>
      {children}
    </SocketContext.Provider>
  );
}
