"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { api, type Workspace } from "@/lib/api";
import { useAppStore } from "@/store";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}

function IconArrowUp() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7.5,2.5 7.5,12.5" />
      <polyline points="3.5,6.5 7.5,2.5 11.5,6.5" />
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 7.5L7 13.5a4 4 0 01-5.66-5.66l6.37-6.37A2.5 2.5 0 0111.2 5l-6.4 6.4a1 1 0 01-1.4-1.4L9.5 4" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4.5C1 3.7 1.7 3 2.5 3H6l1.5 2H13.5C14.3 5 15 5.7 15 6.5V12a1.5 1.5 0 01-1.5 1.5H2.5A1.5 1.5 0 011 12V4.5z"/>
    </svg>
  );
}

// Card-specific icons
function IconScan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <line x1="9" y1="9" x2="15" y2="9"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="15" x2="12" y2="15"/>
    </svg>
  );
}

function IconDeep() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
    </svg>
  );
}

function IconTrack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  );
}

function IconBrief() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  );
}

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS = [
  {
    kind: "scan",
    title: "竞品扫描",
    desc: "给一个名字，我帮你梳理它的产品、定价与最近动态。",
    competitor: "Cursor",
    focus: ["产品页", "定价", "更新日志"],
    Icon: IconScan,
  },
  {
    kind: "intel",
    title: "深度调研",
    desc: "一段话讲清对手的定位、优势与最近三十天的动作。",
    competitor: "Devin AI",
    focus: ["定位", "目标客群", "护城河", "近30天动态"],
    Icon: IconDeep,
  },
  {
    kind: "track",
    title: "持续追踪",
    desc: "对手有任何更新，第一时间提醒你。",
    competitor: "Lovable",
    focus: ["更新日志", "功能差异", "周期监控"],
    Icon: IconTrack,
  },
  {
    kind: "brief",
    title: "情报简报",
    desc: "每周自动生成可直接分享的中英文报告。",
    competitor: "AI编程助手赛道周报",
    focus: ["本周变化", "赛道全景"],
    Icon: IconBrief,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const {
    workspaces,
    activeWorkspaceId,
    sidebarCollapsed,
    unreadCount,
    setWorkspaces,
    setActiveWorkspace,
    setSidebarCollapsed,
  } = useAppStore();

  const [bannerVisible, setBannerVisible] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load workspaces and create default if none
  const loadWorkspaces = useCallback(async () => {
    try {
      const list = await api.workspaces.list();
      if (list.length === 0) {
        const ws = await api.workspaces.create("默认工作空间", "自动创建的默认工作空间");
        setWorkspaces([ws]);
        setActiveWorkspace(ws.id);
      } else {
        setWorkspaces(list);
        if (!activeWorkspaceId) setActiveWorkspace(list[0].id);
      }
    } catch {
      // Offline or backend not ready — proceed silently
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Load unread notifications
  useEffect(() => {
    api.notifications.list(undefined, true).then((n) => {
      useAppStore.getState().setNotifications(n);
    }).catch(() => {});
  }, []);

  // Auto-resize textarea
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  async function createTask(competitorName: string, focusAreas: string[]) {
    if (!activeWorkspaceId) return;
    setSubmitting(true);
    try {
      const task = await api.tasks.create(activeWorkspaceId, competitorName, focusAreas);
      router.push(`/workspaces/${activeWorkspaceId}/tasks/${task.id}`);
    } catch (err) {
      console.error("Failed to create task:", err);
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    // Parse the text: first line is competitor name, rest is focus areas hint
    const lines = text.trim().split("\n").filter(Boolean);
    const competitorName = lines[0].trim();
    const focusAreas = lines.slice(1).flatMap((l) =>
      l.split(/[,，、\s]+/).filter(Boolean)
    );
    await createTask(competitorName, focusAreas.length ? focusAreas : []);
  }

  async function handleCardClick(card: typeof CARDS[number]) {
    if (submitting) return;
    setText(`${card.competitor}\n${card.focus.join(", ")}`);
    await createTask(card.competitor, card.focus);
  }

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const isReady = text.trim().length > 0 && !submitting;

  return (
    <div className="app">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        workspaces={workspaces}
        activeWsId={activeWorkspaceId}
        onWsSelect={setActiveWorkspace}
        unreadCount={unreadCount}
        currentPage="home"
      />

      <div className="main">
        {/* Banner */}
        {bannerVisible && (
          <div className="banner" style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="banner-pill">NEW</span>
              <span>ZorePeer v2 正式上线 — 支持 DeepSeek R2 深度分析与 LaTeX 报告导出</span>
            </div>
            <button className="banner-close" onClick={() => setBannerVisible(false)}>
              <IconX />
            </button>
          </div>
        )}

        {/* Scrollable stage */}
        <div className="stage">
          {/* Hero */}
          <div className="hero">
            <h1 className="hero-title">ZorePeer</h1>
            <p className="hero-sub">让竞品情报，成为你的优势。</p>
          </div>

          {/* Cards */}
          <div className="cards">
            {CARDS.map((card) => (
              <div
                key={card.kind}
                className="card"
                onClick={() => handleCardClick(card)}
              >
                <div className="card-icon">
                  <card.Icon />
                </div>
                <div className="card-title">{card.title}</div>
                <div className="card-desc">{card.desc}</div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="composer-wrap">
            <div className="composer">
              <textarea
                ref={textareaRef}
                className="composer-textarea"
                placeholder="输入竞品名称，例如：Cursor — 或选择上方模版快速开始"
                value={text}
                onChange={handleTextChange}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="composer-footer">
                <div className="composer-chips">
                  {activeWs && (
                    <div className="chip">
                      <IconFolder />
                      <span>{activeWs.name}</span>
                    </div>
                  )}
                </div>
                <div className="composer-actions">
                  <button className="icon-btn" title="附件">
                    <IconPaperclip />
                  </button>
                  <button
                    className={`submit-btn${isReady ? " ready" : ""}`}
                    onClick={handleSubmit}
                    disabled={!isReady}
                    title={isReady ? "提交 (⌘↵)" : "请先输入竞品名称"}
                  >
                    {submitting ? (
                      <span className="spinner" style={{ width: 13, height: 13 }} />
                    ) : (
                      <IconArrowUp />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-3)",
            }}>
              按 ⌘↵ 提交 · ZorePeer 可能出错，请核实重要信息
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
