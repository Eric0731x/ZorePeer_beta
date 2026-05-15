"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppSidebar } from "@/components/app-sidebar";
import { api, type Task, type TaskStatus } from "@/lib/api";
import { useAppStore } from "@/store";

// ── Terminal statuses ─────────────────────────────────────────────────────────
const TERMINAL: Set<TaskStatus> = new Set([
  "COMPLETED", "COMPLETED_NO_UPDATE", "FAILED", "FAILED_COLLECTION",
]);

// ── Inline icons ──────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,2 4,7 9,12"/>
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4H8"/>
      <path d="M2 12a6 6 0 010-8 6 6 0 015.2 3"/>
    </svg>
  );
}

function IconSpinner() {
  return <span className="spinner" />;
}

function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="6"/>
      <ellipse cx="7.5" cy="7.5" rx="2.5" ry="6"/>
      <line x1="1.5" y1="7.5" x2="13.5" y2="7.5"/>
      <line x1="2.5" y1="4.5" x2="12.5" y2="4.5"/>
      <line x1="2.5" y1="10.5" x2="12.5" y2="10.5"/>
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H4a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 004 14h7a1.5 1.5 0 001.5-1.5V5L9 1z"/>
      <polyline points="9,1 9,5 12.5,5"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7,1 7,9"/>
      <polyline points="4,6 7,9 10,6"/>
      <line x1="2" y1="13" x2="12" y2="13"/>
    </svg>
  );
}

function IconPrint() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4V2.5a1 1 0 011-1h5a1 1 0 011 1V4"/>
      <path d="M1.5 8.5h11V12a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V8.5z"/>
      <line x1="1.5" y1="5" x2="12.5" y2="5"/>
      <rect x="4" y="9.5" width="6" height="1.5" rx="0.5"/>
    </svg>
  );
}

// ── Freshness helpers ─────────────────────────────────────────────────────────

function getReportFreshness(updatedAt: string) {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = ageMs / 86400000;
  if (ageDays < 3) return { label: "数据新鲜", cls: "fresh", icon: "✓" };
  if (ageDays < 7) return { label: "数据老化", cls: "aging", icon: "⚠" };
  return { label: "建议刷新", cls: "stale", icon: "!" };
}

function formatRelativeTime(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function formatAbsoluteTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Status label / badge classification ──────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "等待中",
  PLANNING: "规划中",
  COLLECTING: "采集中",
  ANALYZING: "分析中",
  QA_REVIEW: "质检中",
  WRITING: "撰写中",
  MEMORY_SYNC: "记忆同步",
  COMPLETED: "已完成",
  COMPLETED_NO_UPDATE: "无变化",
  FAILED: "失败",
  FAILED_COLLECTION: "采集失败",
};

function statusBadgeClass(status: TaskStatus): string {
  if (status === "COMPLETED" || status === "COMPLETED_NO_UPDATE") return "done";
  if (status === "FAILED" || status === "FAILED_COLLECTION") return "failed";
  return "running";
}

// ── Log entry type ────────────────────────────────────────────────────────────

interface LogLine {
  ts: string;
  agent: string;
  msg: string;
  kind?: "warn" | "success";
}

function nowTs() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function logsForTransition(from: TaskStatus | null, to: TaskStatus, errorReason?: string | null): LogLine[] {
  const lines: LogLine[] = [];
  const ts = nowTs();

  if (to === "PLANNING") {
    lines.push({ ts, agent: "[Planner]", msg: "接收调研指令，提取关键词与目标维度..." });
    lines.push({ ts: nowTs(), agent: "[Planner]", msg: "生成搜索策略与信息采集清单" });
  }
  if (to === "COLLECTING") {
    lines.push({ ts, agent: "[Collector]", msg: "开始检索官网与定价页..." });
    lines.push({ ts: nowTs(), agent: "[Collector]", msg: "抓取页面快照，Tavily 并发搜索中..." });
  }
  if (to === "ANALYZING") {
    lines.push({ ts, agent: "[Analyzer]", msg: "提取关键变化点，填充分析维度..." });
  }
  if (to === "QA_REVIEW") {
    lines.push({ ts, agent: "[QA]", msg: "复审分析结论，校验证据充分性..." });
  }
  if (to === "WRITING") {
    lines.push({ ts, agent: "[Writer]", msg: "撰写竞品研报 Markdown 文档..." });
  }
  if (to === "MEMORY_SYNC") {
    lines.push({ ts, agent: "[MemorySync]", msg: "归档至工作空间记忆（Mem0）..." });
  }
  if (to === "COMPLETED" || to === "COMPLETED_NO_UPDATE") {
    lines.push({ ts, agent: "[System]", msg: "任务完成 · 报告已就绪 ✓", kind: "success" });
  }
  if (to === "FAILED" || to === "FAILED_COLLECTION") {
    lines.push({
      ts, agent: "[QA]",
      msg: `拦截: ${errorReason ?? "数据不足，无法生成有效报告"}`,
      kind: "warn",
    });
  }
  return lines;
}

// ── DAG node / edge model ─────────────────────────────────────────────────────

type NodeState = "idle" | "active" | "done" | "active-red";

interface DagNodeDef {
  key: string;
  label: string;
  sub: string;
  x: number;
}

const DAG_NODES: DagNodeDef[] = [
  { key: "planner",    label: "Planner",    sub: "规划",     x: 40  },
  { key: "collector",  label: "Collector",  sub: "采集",     x: 160 },
  { key: "analyzer",   label: "Analyzer",   sub: "分析",     x: 280 },
  { key: "qa",         label: "QA",         sub: "质检",     x: 400 },
  { key: "writer",     label: "Writer",     sub: "撰写",     x: 520 },
  { key: "memorySync", label: "Memory",     sub: "归档",     x: 640 },
];

const NODE_R = 28;
const SVG_H = 130;

function getNodeStates(status: TaskStatus): Record<string, NodeState> {
  const s: Record<string, NodeState> = {
    planner: "idle", collector: "idle", analyzer: "idle",
    qa: "idle", writer: "idle", memorySync: "idle",
  };
  switch (status) {
    case "PLANNING":      s.planner = "active"; break;
    case "COLLECTING":    s.planner = "done"; s.collector = "active"; break;
    case "ANALYZING":     s.planner = "done"; s.collector = "done"; s.analyzer = "active"; break;
    case "QA_REVIEW":     s.planner = "done"; s.collector = "done"; s.analyzer = "done"; s.qa = "active"; break;
    case "WRITING":       s.planner = "done"; s.collector = "done"; s.analyzer = "done"; s.qa = "done"; s.writer = "active"; break;
    case "MEMORY_SYNC":   s.planner = "done"; s.collector = "done"; s.analyzer = "done"; s.qa = "done"; s.writer = "done"; s.memorySync = "active"; break;
    case "COMPLETED":
    case "COMPLETED_NO_UPDATE":
      Object.keys(s).forEach((k) => { s[k] = "done"; }); break;
    case "FAILED_COLLECTION":
      s.planner = "done"; s.collector = "done"; s.analyzer = "done";
      s.qa = "active-red";
      break;
    case "FAILED":
      s.planner = "done"; break;
  }
  return s;
}

interface DagVisualizerProps {
  status: TaskStatus;
}

function InlineDagVisualizer({ status }: DagVisualizerProps) {
  const states = getNodeStates(status);
  const showRedoArc = status === "FAILED_COLLECTION";

  const nodeColor = (key: string) => {
    const st = states[key];
    if (st === "done") return { fill: "rgba(52,199,89,0.1)", stroke: "#34c759" };
    if (st === "active") return { fill: "rgba(0,113,227,0.1)", stroke: "#0071e3" };
    if (st === "active-red") return { fill: "rgba(255,59,48,0.08)", stroke: "#ff3b30" };
    return { fill: "#f5f5f7", stroke: "#e5e5ea" };
  };

  const textColor = (key: string) => {
    const st = states[key];
    if (st === "done") return "#2c8a47";
    if (st === "active") return "#0071e3";
    if (st === "active-red") return "#c0392b";
    return "#a1a1a6";
  };

  const edgeColor = (fromKey: string) => {
    const st = states[fromKey];
    if (st === "done") return "#34c759";
    return "#e5e5ea";
  };

  const cy = SVG_H / 2 - 10;

  return (
    <div className="dag-wrap">
      <svg
        className="dag-svg"
        viewBox={`0 0 720 ${SVG_H}`}
        aria-label="Agent pipeline DAG"
      >
        <defs>
          <marker id="arrow-g" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#34c759" />
          </marker>
          <marker id="arrow-gray" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#e5e5ea" />
          </marker>
          <marker id="arrow-red" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#ff3b30" />
          </marker>
        </defs>

        {/* Forward edges */}
        {DAG_NODES.slice(0, -1).map((node, i) => {
          const next = DAG_NODES[i + 1];
          const col = edgeColor(node.key);
          const isDone = col === "#34c759";
          return (
            <line
              key={node.key}
              x1={node.x + 56 + NODE_R}
              y1={cy}
              x2={next.x + 56 - NODE_R}
              y2={cy}
              stroke={col}
              strokeWidth="1.5"
              markerEnd={isDone ? "url(#arrow-g)" : "url(#arrow-gray)"}
            />
          );
        })}

        {/* Redo arc: QA → Collector */}
        {showRedoArc && (() => {
          const qaNode = DAG_NODES.find(n => n.key === "qa")!;
          const colNode = DAG_NODES.find(n => n.key === "collector")!;
          const x1 = qaNode.x + 56;
          const x2 = colNode.x + 56;
          const ry = cy - NODE_R - 12;
          return (
            <path
              d={`M ${x1} ${cy - NODE_R} Q ${(x1 + x2) / 2} ${ry - 24} ${x2} ${cy - NODE_R}`}
              fill="none"
              stroke="#ff3b30"
              strokeWidth="1.8"
              strokeDasharray="5 3"
              markerEnd="url(#arrow-red)"
              className="edge-redo"
            />
          );
        })()}

        {/* Nodes */}
        {DAG_NODES.map((node) => {
          const cx = node.x + 56;
          const st = states[node.key];
          const col = nodeColor(node.key);
          const tc = textColor(node.key);
          return (
            <g key={node.key}>
              {/* Breathing ring for active */}
              {(st === "active" || st === "active-red") && (
                <circle
                  className="dag-ring"
                  cx={cx}
                  cy={cy}
                  r={NODE_R + 4}
                  fill="none"
                  stroke={st === "active-red" ? "#ff3b30" : "#0071e3"}
                  strokeWidth="1.5"
                  opacity="0.5"
                />
              )}
              {/* Main circle */}
              <circle
                cx={cx}
                cy={cy}
                r={NODE_R}
                fill={col.fill}
                stroke={col.stroke}
                strokeWidth="1.8"
              />
              {/* Icon inside */}
              {st === "done" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="#2c8a47" fontSize="14" fontWeight="bold">✓</text>
              )}
              {st === "active" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="#0071e3" fontSize="10">▶</text>
              )}
              {st === "active-red" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="#c0392b" fontSize="12">!</text>
              )}
              {/* Label below */}
              <text x={cx} y={cy + NODE_R + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={tc} fontFamily="-apple-system,sans-serif">
                {node.label}
              </text>
              <text x={cx} y={cy + NODE_R + 26} textAnchor="middle" fontSize="9.5" fill="#a1a1a6" fontFamily="-apple-system,sans-serif">
                {node.sub}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="dag-legend">
        <div className="dag-legend-item">
          <div className="dag-legend-dot" style={{ background: "rgba(0,113,227,0.2)", border: "1.5px solid #0071e3" }} />
          运行中
        </div>
        <div className="dag-legend-item">
          <div className="dag-legend-dot" style={{ background: "rgba(52,199,89,0.2)", border: "1.5px solid #34c759" }} />
          已完成
        </div>
        <div className="dag-legend-item">
          <div className="dag-legend-dot" style={{ background: "#f5f5f7", border: "1.5px solid #e5e5ea" }} />
          等待中
        </div>
        <div className="dag-legend-item">
          <div className="dag-legend-dot" style={{ background: "transparent", border: "1.5px dashed #ff3b30" }} />
          QA 打回
        </div>
      </div>
    </div>
  );
}

// ── Mock sources ──────────────────────────────────────────────────────────────

interface MockSource {
  title: string;
  url: string;
  stage: string;
}

function getSourcesForStatus(status: TaskStatus, competitorName: string): MockSource[] {
  const inProgress = !TERMINAL.has(status) && status !== "PENDING" && status !== "PLANNING";
  if (!inProgress && !TERMINAL.has(status)) return [];
  return [
    { title: `${competitorName} 官方网站`, url: `https://www.${competitorName.toLowerCase().replace(/\s+/g, "")}.com`, stage: "官网" },
    { title: `${competitorName} 定价页`, url: `https://www.${competitorName.toLowerCase().replace(/\s+/g, "")}.com/pricing`, stage: "定价" },
    { title: `${competitorName} 更新日志`, url: `https://www.${competitorName.toLowerCase().replace(/\s+/g, "")}.com/changelog`, stage: "动态" },
    { title: `Product Hunt: ${competitorName}`, url: `https://www.producthunt.com/products/${competitorName.toLowerCase().replace(/\s+/g, "-")}`, stage: "社区" },
    { title: `Twitter/X: ${competitorName} mentions`, url: `https://twitter.com/search?q=${encodeURIComponent(competitorName)}`, stage: "社交" },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { id: workspaceId, taskId } = useParams<{ id: string; taskId: string }>();
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

  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [activeTab, setActiveTab] = useState<"dag" | "report" | "sources">("dag");
  const prevStatusRef = useRef<TaskStatus | null>(null);
  const logsBottomRef = useRef<HTMLDivElement>(null);

  // Load workspaces if not in store
  useEffect(() => {
    if (workspaces.length === 0) {
      api.workspaces.list().then((list) => {
        setWorkspaces(list);
        if (!activeWorkspaceId && list.length > 0) setActiveWorkspace(list[0].id);
      }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Append initial log
  useEffect(() => {
    setLogs([{ ts: nowTs(), agent: "[System]", msg: "任务已创建，等待 Agent 调度..." }]);
  }, [taskId]);

  const applyTaskUpdate = useCallback((updated: Task) => {
    setTask(updated);
    const prev = prevStatusRef.current;
    if (updated.status !== prev) {
      const newLines = logsForTransition(prev, updated.status, updated.error_reason);
      if (newLines.length > 0) {
        setLogs((cur) => [...cur, ...newLines]);
      }
      prevStatusRef.current = updated.status;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    api.tasks.get(taskId).then(applyTaskUpdate).catch(() => {});
  }, [taskId, applyTaskUpdate]);

  // Polling
  useEffect(() => {
    if (!task) return;
    if (TERMINAL.has(task.status)) return;
    const iv = setInterval(() => {
      api.tasks.get(taskId).then(applyTaskUpdate).catch(() => {});
    }, 2000);
    return () => clearInterval(iv);
  }, [task, taskId, applyTaskUpdate]);

  // Scroll logs to bottom
  useEffect(() => {
    logsBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Handle re-run
  async function handleRerun() {
    if (!task) return;
    try {
      const focusAreas = task.focus_areas ?? [];
      const newTask = await api.tasks.create(task.workspace_id, task.competitor_name, focusAreas);
      router.push(`/workspaces/${task.workspace_id}/tasks/${newTask.id}`);
    } catch (err) {
      console.error("Failed to re-run task:", err);
    }
  }

  // Export handlers
  async function handleExportLatex() {
    if (!task) return;
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${BASE}/api/v1/tasks/${task.id}/export/latex`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${task.id}.tex`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("LaTeX export failed:", err);
    }
  }

  function handleExportMarkdown() {
    if (!task?.report_content) return;
    const blob = new Blob([task.report_content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${task.competitor_name}_${task.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    window.print();
  }

  if (!task) {
    return (
      <div className="app">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          workspaces={workspaces}
          activeWsId={activeWorkspaceId}
          onWsSelect={setActiveWorkspace}
          unreadCount={unreadCount}
          currentPage="task"
        />
        <div className="main" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-2)" }}>
            <IconSpinner />
            <span style={{ fontSize: 14 }}>正在加载任务...</span>
          </div>
        </div>
      </div>
    );
  }

  const isTerminal = TERMINAL.has(task.status);
  const isFailed = task.status === "FAILED" || task.status === "FAILED_COLLECTION";
  const isCompleted = task.status === "COMPLETED" || task.status === "COMPLETED_NO_UPDATE";
  const badgeClass = statusBadgeClass(task.status);
  const focusAreas: string[] = Array.isArray(task.focus_areas) ? task.focus_areas : [];
  const wsName = workspaces.find((w) => w.id === workspaceId)?.name ?? "工作空间";
  const sources = getSourcesForStatus(task.status, task.competitor_name);
  const freshness = isCompleted && task.updated_at ? getReportFreshness(task.updated_at) : null;

  return (
    <div className="app">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        workspaces={workspaces}
        activeWsId={workspaceId}
        onWsSelect={(id) => {
          setActiveWorkspace(id);
          router.push(`/workspaces/${id}`);
        }}
        unreadCount={unreadCount}
        currentPage="task"
      />

      <div className="main">
        <div className="run-view">
          {/* Header / breadcrumb */}
          <div className="run-header">
            <Link href={`/workspaces/${workspaceId}`} className="run-header-back">
              <IconArrowLeft />
            </Link>
            <div className="breadcrumb">
              <span className="breadcrumb-ws">{wsName}</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-task">{task.competitor_name}</span>
            </div>
            <div className={`status-badge ${badgeClass}`}>
              <span className="status-dot" />
              {STATUS_LABELS[task.status]}
            </div>
          </div>

          {/* Split layout */}
          <div className="split">
            {/* Left: control panel */}
            <div className="control-panel">
              {/* Task card */}
              <div className="task-card">
                <div className="task-card-name">{task.competitor_name}</div>
                {focusAreas.length > 0 && (
                  <div className="focus-chips">
                    {focusAreas.map((fa) => (
                      <span key={fa} className="focus-chip">{fa}</span>
                    ))}
                  </div>
                )}

                {/* Action button */}
                {isTerminal ? (
                  <button
                    className="task-action-btn active"
                    onClick={handleRerun}
                  >
                    <IconRefresh />
                    重新执行
                  </button>
                ) : (
                  <button className="task-action-btn" disabled>
                    <IconSpinner />
                    分析中...
                  </button>
                )}
              </div>

              {/* Streaming logs */}
              <div className="logs" style={{ flex: 1 }}>
                {logs.map((line, i) => (
                  <div key={i} className={`log-line${line.kind ? ` ${line.kind}` : ""}`}>
                    <span className="log-ts">{line.ts}</span>
                    <span className="log-agent">{line.agent}</span>
                    <span className="log-msg">{line.msg}</span>
                  </div>
                ))}
                <div ref={logsBottomRef} />
              </div>
            </div>

            {/* Right: tabs */}
            <div className="stage-panel">
              <div className="tabs">
                <button
                  className={`tab${activeTab === "dag" ? " active" : ""}`}
                  onClick={() => setActiveTab("dag")}
                >
                  Agent 协作
                </button>
                <button
                  className={`tab${activeTab === "report" ? " active" : ""}${!isCompleted ? " disabled" : ""}`}
                  onClick={() => { if (isCompleted) setActiveTab("report"); }}
                >
                  竞品研报
                </button>
                <button
                  className={`tab${activeTab === "sources" ? " active" : ""}`}
                  onClick={() => setActiveTab("sources")}
                >
                  信息来源
                  {sources.length > 0 && (
                    <span className="tab-count">{sources.length}</span>
                  )}
                </button>
              </div>

              <div className="tab-body">
                {/* Tab: DAG */}
                {activeTab === "dag" && (
                  <InlineDagVisualizer status={task.status} />
                )}

                {/* Tab: Report */}
                {activeTab === "report" && (
                  <>
                    {!isCompleted || !task.report_content ? (
                      <div className="report-empty">
                        <div className="report-empty-icon">
                          <IconFile />
                        </div>
                        {isFailed ? (
                          <>
                            <div className="report-empty-title">任务失败</div>
                            <div className="report-empty-sub">
                              {task.error_reason ?? "数据不足，无法生成有效报告"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="report-empty-title">研报正在生成</div>
                            <div className="report-empty-sub">
                              Writer 完成后会自动渲染到这里
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="report-wrap">
                        <div className="report-header">
                          <div className="report-title">
                            {task.competitor_name} · 竞品情报简报
                          </div>
                          <div className="report-meta">
                            <span className="report-freshness">
                              生成于 {formatRelativeTime(task.updated_at)} · {formatAbsoluteTime(task.updated_at)}
                            </span>
                            {freshness && (
                              <span className={`freshness-badge ${freshness.cls}`}>
                                {freshness.icon} {freshness.label}
                              </span>
                            )}
                          </div>
                          <div className="report-actions">
                            <button className="report-btn" onClick={handleExportPdf}>
                              <IconPrint />
                              导出 PDF
                            </button>
                            <button className="report-btn" onClick={handleExportLatex}>
                              <IconDownload />
                              导出 LaTeX
                            </button>
                            <button className="report-btn" onClick={handleExportMarkdown}>
                              <IconDownload />
                              导出 Markdown
                            </button>
                            <button className="report-btn primary" onClick={handleRerun}>
                              <IconRefresh />
                              重新生成
                            </button>
                          </div>
                        </div>
                        <div className="report-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {task.report_content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Tab: Sources */}
                {activeTab === "sources" && (
                  <div className="sources">
                    {sources.length === 0 ? (
                      <div className="sources-empty">
                        采集器还在工作⋯<br />
                        这里会实时列出所有引用来源。
                      </div>
                    ) : (
                      sources.map((src, i) => (
                        <div key={i} className="source-row">
                          <div className="source-icon">
                            <IconGlobe />
                          </div>
                          <div className="source-body">
                            <div className="source-title">{src.title}</div>
                            <div className="source-url">{src.url}</div>
                          </div>
                          <span className="source-stage">{src.stage}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
