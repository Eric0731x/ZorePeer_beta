"use client";

import Link from "next/link";
import type { Workspace } from "@/lib/api";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4.5C1 3.7 1.7 3 2.5 3H6l1.5 2H13.5C14.3 5 15 5.7 15 6.5V12a1.5 1.5 0 01-1.5 1.5H2.5A1.5 1.5 0 011 12V4.5z"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,5 8,8 10.5,10" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2a4.5 4.5 0 014.5 4.5c0 3 1 4 1 4H2.5s1-1 1-4A4.5 4.5 0 018 2z"/>
      <path d="M6.5 12.5a1.5 1.5 0 003 0"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  workspaces: (Workspace & { taskCount?: number })[];
  activeWsId?: string | null;
  onWsSelect?: (id: string) => void;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  currentPage?: "home" | "task";
}

export function AppSidebar({
  collapsed,
  onToggle,
  workspaces,
  activeWsId,
  onWsSelect,
  unreadCount = 0,
  onNotificationsClick,
  currentPage = "home",
}: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">Z</div>
          <span className="sidebar-logo-text">ZorePeer</span>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <IconMenu />
        </button>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        <Link href="/" className={`nav-item${currentPage === "home" ? " active" : ""}`}>
          <IconPlus />
          <span className="nav-item-label">新建任务</span>
        </Link>
        <button
          className="nav-item"
          style={{ pointerEvents: "none", opacity: 0.5 }}
          tabIndex={-1}
        >
          <IconClock />
          <span className="nav-item-label">周期监控</span>
        </button>
        <button
          className="nav-item"
          onClick={onNotificationsClick}
          style={{ position: "relative" }}
        >
          <IconBell />
          <span className="nav-item-label">情报预警</span>
          {unreadCount > 0 && (
            <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>
      </nav>

      <div className="sidebar-divider" />

      {/* Workspaces */}
      <div className="sidebar-section-label">工作空间</div>
      <div className="sidebar-workspaces">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`ws-item${activeWsId === ws.id ? " active" : ""}`}
            onClick={() => onWsSelect?.(ws.id)}
          >
            <span className="ws-item-dot" />
            <span className="ws-item-name">{ws.name}</span>
            {ws.taskCount !== undefined && (
              <span className="ws-item-count">{ws.taskCount}</span>
            )}
          </div>
        ))}
        {workspaces.length === 0 && !collapsed && (
          <div style={{ padding: "6px 8px", fontSize: 12, color: "var(--text-3)" }}>
            暂无工作空间
          </div>
        )}
      </div>

      {/* User pill */}
      <div className="sidebar-user">
        <div className="user-pill">
          <div className="user-avatar">Z</div>
          <span className="user-name">ZorePeer 用户</span>
        </div>
      </div>
    </aside>
  );
}
