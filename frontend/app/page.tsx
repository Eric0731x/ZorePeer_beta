"use client";

import { useEffect, useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import { api, type Workspace } from "@/lib/api";
import { useAppStore } from "@/store";
import Link from "next/link";

export default function HomePage() {
  const { workspaces, setWorkspaces } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.workspaces.list().then(setWorkspaces).catch(() => {});
  }, [setWorkspaces]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const ws = await api.workspaces.create(name.trim(), description.trim() || undefined);
      setWorkspaces([ws, ...workspaces]);
      setShowCreate(false);
      setName("");
      setDescription("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">工作空间</h1>
          <p className="text-slate-500 text-sm mt-1">每个工作空间对应一组竞品追踪任务</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          新建工作空间
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">新建工作空间</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">名称</label>
                <input
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="例：AI 编程助手调研"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">描述（可选）</label>
                <input
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="简短说明这个工作空间的用途"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-800 text-sm transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {loading ? "创建中…" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">暂无工作空间</p>
          <p className="text-sm mt-1">点击右上角按钮创建第一个</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-600 hover:bg-slate-800/60 transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <FolderOpen size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors mt-0.5" />
                </div>
                <h2 className="mt-3 font-semibold text-slate-100 text-base">{ws.name}</h2>
                {ws.description && (
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">{ws.description}</p>
                )}
                <p className="text-slate-600 text-xs mt-3">
                  {new Date(ws.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
