"use client";

import React from "react";
import { CheckCheck, Inbox, Loader2 } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    nextCursor,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications();

  if (!isOpen) return null;

  const handleNotificationClick = async (
    notificationId: string,
    isUnread: boolean,
  ) => {
    if (isUnread) {
      await markRead(notificationId);
    }
  };

  return (
    <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 z-50 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-xs font-bold text-slate-900">Notifications</h2>
          <p className="text-[11px] text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You are all caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          title="Mark all as read"
          className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-slate-600 hover:text-[#23055c] hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-40 disabled:cursor-default flex items-center gap-1.5"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark all read</span>
        </button>
      </div>

      <div className="max-h-[calc(100vh-12rem)] sm:max-h-96 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 && !isLoading ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const unread = !item.readAt;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNotificationClick(item.id, unread)}
                className={`w-full text-left p-3.5 sm:p-4 transition cursor-pointer ${
                  unread
                    ? "bg-purple-50/40 hover:bg-purple-50/70"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex gap-2.5 sm:gap-3 items-start">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 transition-colors ${
                      unread
                        ? "bg-[#23055c]"
                        : "bg-transparent border border-slate-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 leading-snug break-words">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1 break-words whitespace-normal overflow-wrap-anywhere">
                      {item.message}
                    </p>
                    {unread && (
                      <span className="inline-block mt-2 text-[10px] font-medium text-[#23055c] bg-purple-100/60 px-2 py-0.5 rounded-md">
                        Tap to mark as read
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {(isLoading || nextCursor) && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="w-full text-xs font-semibold text-[#23055c] hover:bg-slate-100 rounded-lg py-1.5 transition cursor-pointer"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
