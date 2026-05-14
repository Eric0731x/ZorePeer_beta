"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Task, type TaskStatus } from "@/lib/api";
import { DagVisualizer } from "@/components/dag-visualizer";

const TERMINAL_STATUSES: TaskStatus[] = ["COMPLETED", "COMPLETED_NO_UPDATE", "FAILED", "FAILED_COLLECTION"];

export default function TaskDetailPage() {
  const { id: workspaceId, taskId } = useParams<{ id: string; taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);

  const refresh = useCallback(() => {
    api.tasks.get(taskId).then(setTask).catch(() => {});
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll until terminal
  useEffect(() => {
    if (!task || TERMINAL_STATUSES.includes(task.status)) return;
    const interval = setInterval(refresh, Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000);
    return () => clearInterval(interval);
  }, [task, refresh]);

  if (!task) {
    return (
      <div className="flex items-center justify-center py-40 text-slate-500 text-sm">加载中…</div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(task.status);
  const isFailed = task.status === "FAILED" || task.status === "FAILED_COLLECTION";

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href={`/workspaces/${workspaceId}`}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm transition-colors">
          <ArrowLeft size={14} /> 返回工作空间
        </Link>
        <h1 className="text-xl font-bold text-slate-100 mt-2">{task.competitor_name}</h1>
        {task.focus_areas && task.focus_areas.length > 0 && (
          <p className="text-slate-500 text-sm mt-0.5">关注维度：{task.focus_areas.join(" · ")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* DAG Visualizer */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Agent 执行流
            </h2>
            <DagVisualizer status={task.status} />
            {task.langsmith_trace_id && (
              <a
                href={`https://smith.langchain.com/o/traces/${task.langsmith_trace_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink size={11} /> LangSmith Trace
              </a>
            )}
          </div>
        </div>

        {/* Report / Status pane */}
        <div className="lg:col-span-3">
          {isFailed ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
              <h2 className="text-sm font-semibold text-red-400 mb-2">任务失败</h2>
              <p className="text-slate-400 text-sm">{task.error_reason ?? "未知错误"}</p>
            </div>
          ) : !isTerminal ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col items-center justify-center min-h-48 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">AI Agent 正在运行中，请稍候…</p>
            </div>
          ) : task.report_content ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                情报报告
              </h2>
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-400 prose-li:text-slate-400 prose-code:text-indigo-300 prose-a:text-indigo-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {task.report_content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-center text-slate-500 text-sm">
              报告尚未生成
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
