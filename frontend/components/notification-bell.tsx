"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAppStore } from "@/store";
import { api } from "@/lib/api";

export function NotificationBell() {
  const { notifications, unreadCount, setNotifications, markNotificationRead } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.notifications.list(undefined, false).then(setNotifications).catch(() => {});
    const t = setInterval(() => {
      api.notifications.list(undefined, false).then(setNotifications).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [setNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkRead(id: string) {
    await api.notifications.markRead(id).catch(() => {});
    markNotificationRead(id);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">情报预警</span>
            <span className="text-xs text-slate-500">{unreadCount} 条未读</span>
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-500 text-sm">暂无通知</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors ${!n.is_read ? "border-l-2 border-indigo-500" : ""}`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <p className={`text-sm font-medium ${n.is_read ? "text-slate-400" : "text-slate-200"}`}>
                  {n.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  {new Date(n.created_at).toLocaleString("zh-CN")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
