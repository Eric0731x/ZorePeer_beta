import { create } from "zustand";
import type { Workspace, Notification } from "@/lib/api";

interface AppState {
  workspaces: (Workspace & { taskCount?: number })[];
  activeWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  unreadCount: number;

  setWorkspaces: (ws: (Workspace & { taskCount?: number })[]) => void;
  setActiveWorkspace: (id: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setNotifications: (n: Notification[]) => void;
  markNotificationRead: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  sidebarCollapsed: false,
  notifications: [],
  unreadCount: 0,

  setWorkspaces: (ws) => set({ workspaces: ws }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setNotifications: (n) =>
    set({ notifications: n, unreadCount: n.filter((x) => !x.is_read).length }),
  markNotificationRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.is_read).length };
    }),
}));
