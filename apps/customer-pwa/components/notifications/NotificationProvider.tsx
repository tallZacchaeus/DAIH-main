"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, useAuth } from "@daih/api-client";
import { NotificationDTO } from "@daih/types";
import { useToast } from "@daih/ui";

interface NotificationContextValue {
  notifications: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  nextCursor?: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggle: () => void;
  close: () => void;
  markRead: (id: string) => Promise<NotificationDTO | null>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);

  const mergeNotifications = useCallback((items: NotificationDTO[]) => {
    setNotifications((current) => {
      const byId = new Map<string, NotificationDTO>();
      [...items, ...current].forEach((item) => byId.set(item.id, item));
      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    try {
      const result = await api.notifications.list({ limit: 20 });
      const incoming = result.notifications || [];

      if (hasLoadedRef.current) {
        incoming
          .filter((item) => !seenIdsRef.current.has(item.id) && !item.readAt)
          .slice()
          .reverse()
          .forEach((item) => {
            toast.info(item.message, { title: item.title });
          });
      }

      seenIdsRef.current = new Set(incoming.map((item) => item.id));
      hasLoadedRef.current = true;
      setNotifications(incoming);
      setUnreadCount(result.unreadCount || 0);
      setNextCursor(result.nextCursor || null);
    } catch (err) {
      console.warn("Could not load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast, user]);

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || !user || !nextCursor) return;

    setIsLoading(true);
    try {
      const result = await api.notifications.list({
        limit: 20,
        cursor: nextCursor,
      });
      mergeNotifications(result.notifications || []);
      setUnreadCount(result.unreadCount || 0);
      setNextCursor(result.nextCursor || null);
    } catch (err) {
      console.warn("Could not load more notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, mergeNotifications, nextCursor, user]);

  const markRead = useCallback(async (id: string) => {
    try {
      const updated = await api.notifications.markRead(id);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      const countResult = await api.notifications.getUnreadCount();
      setUnreadCount(countResult.unreadCount || 0);
      return updated;
    } catch (err) {
      console.warn("Could not mark notification as read:", err);
      return null;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const result = await api.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt || readAt,
        })),
      );
      setUnreadCount(result.unreadCount || 0);
    } catch (err) {
      console.warn("Could not mark all notifications as read:", err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setNextCursor(null);
      setIsOpen(false);
      seenIdsRef.current = new Set();
      hasLoadedRef.current = false;
      return;
    }

    refresh();
    const interval = window.setInterval(refresh, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, refresh, user]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isOpen,
      nextCursor,
      refresh,
      loadMore,
      toggle: () => setIsOpen((current) => !current),
      close: () => setIsOpen(false),
      markRead,
      markAllRead,
    }),
    [
      isLoading,
      isOpen,
      loadMore,
      markAllRead,
      markRead,
      nextCursor,
      notifications,
      refresh,
      unreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
