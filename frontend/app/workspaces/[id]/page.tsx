"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { api, type Workspace, type Task, type TaskStatus } from "@/lib/api";

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

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "text-green-400 bg-green-400/10",
  COMPLETED_NO_UPDATE: "text-slate-400 bg-slate-700",
  FAILED: "text-red-400 bg-red-400/10",
  FAILED_COLLECTION: "text-red-400 bg-red-400/10",
};

const IN_PROGRESS = new Set(["PENDING","PLANNING","COLLECTING","ANALYZING","QA_REVIEW","WRITING","MEMORY_SYNC"]);

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [competitorName, setCompetitorName] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.workspaces.get(id).then(setWorkspace).catch(() => {});
    api.tasks.list(id).then(setTasks).catch(() => {});
  }, [id]);

  // Poll for in-progress tasks
  useEffect(() => {
    const hasActive = tasks.some((t) => IN_PROGRESS.has(t.status));
    if (!hasActive) return;
    const t = setInterval(() => {
      api.tasks.list(id).then(setTasks).catch(() => {});
    }, Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000);
    return () => clearInterval(t);
  }, [id, tasks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!competitorName.trim()) return;
    setLoading(true);
    try {
      const areas = focusAreas.split(/[,，、\s]+/).filter(Boolean);
      const task = await api.tasks.create(id, competitorName.trim(), areas.length ? areas : undefined);
      setTasks((prev) => [task, ...prev]);
      setShowCreate(false);
      setCompetitorName("");
      setFocusAreas("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm transition-colors">
          <ArrowLeft size={14} /> 所有工作空间
        </Link>
        <h1 className="text-xl font-bold text-slate-100 mt-2">{workspace?.name ?? "…"}</h1>
        {workspace?.description && <p className="text-slate-500 text-sm mt-0.5">{workspace.description}</p>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-400">情报任务</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} /> 新建任务
        </button>
      </div>

      {/* Create task modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">新建竞品分析任务</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">竞品名称</label>
                <input
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="例：大疆 Pocket 3"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">关注维度（逗号分隔，可选）</label>
                <input
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="价格, 新功能, 用户评价"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800 text-sm transition-colors">
                  取消
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {loading ? "启动中…" : "启动分析"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">暂无任务，点击"新建任务"开始分析</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/workspaces/${id}/tasks/${task.id}`}>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 hover:border-indigo-700 hover:bg-slate-800/50 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  {IN_PROGRESS.has(task.status) ? (
                    <Loader2 size={18} className="text-indigo-400 animate-spin flex-shrink-0" />
                  ) : task.status === "COMPLETED" || task.status === "COMPLETED_NO_UPDATE" ? (
                    <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-slate-200 text-sm group-hover:text-slate-100">
                      {task.competitor_name}
                    </p>
                    {task.focus_areas && task.focus_areas.length > 0 && (
                      <p className="text-slate-500 text-xs mt-0.5">{task.focus_areas.join(" · ")}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOR[task.status] ?? "text-indigo-400 bg-indigo-400/10"}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                  <Clock size={12} className="text-slate-600" />
                  <span className="text-xs text-slate-600">
                    {new Date(task.created_at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
