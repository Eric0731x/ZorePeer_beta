"use client";

import { useEffect, useState } from "react";
import type { TaskStatus } from "@/lib/api";

interface DagNode {
  id: TaskStatus;
  label: string;
  description: string;
  x: number;
  y: number;
}

const NODES: DagNode[] = [
  { id: "PLANNING",       label: "Planner",      description: "生成搜索词与分析维度",  x: 240, y: 40  },
  { id: "COLLECTING",     label: "Collector",    description: "Tavily 并发搜索",        x: 240, y: 130 },
  { id: "ANALYZING",      label: "Analyzer",     description: "提取证据填充维度",        x: 240, y: 220 },
  { id: "QA_REVIEW",      label: "QA",           description: "质检：证据充分性校验",    x: 240, y: 310 },
  { id: "WRITING",        label: "Writer",       description: "生成 Markdown 报告",     x: 120, y: 400 },
  { id: "MEMORY_SYNC",    label: "Memory Sync",  description: "洞察存入 Mem0",           x: 120, y: 490 },
  { id: "COMPLETED",      label: "Completed",    description: "任务完成",                x: 120, y: 580 },
  { id: "FAILED_COLLECTION", label: "Failed",    description: "QA 拦截 / 无数据",       x: 380, y: 400 },
];

// Directed edges: [from, to]
const EDGES: [TaskStatus, TaskStatus][] = [
  ["PLANNING",       "COLLECTING"],
  ["COLLECTING",     "ANALYZING"],
  ["ANALYZING",      "QA_REVIEW"],
  ["QA_REVIEW",      "WRITING"],
  ["QA_REVIEW",      "FAILED_COLLECTION"],
  ["WRITING",        "MEMORY_SYNC"],
  ["MEMORY_SYNC",    "COMPLETED"],
];

const STATUS_ORDER: TaskStatus[] = [
  "PENDING", "PLANNING", "COLLECTING", "ANALYZING",
  "QA_REVIEW", "WRITING", "MEMORY_SYNC", "COMPLETED",
];

function isNodeActive(nodeId: TaskStatus, currentStatus: TaskStatus): "active" | "done" | "failed" | "idle" {
  if (nodeId === "FAILED_COLLECTION" || nodeId === "FAILED") {
    return (currentStatus === "FAILED_COLLECTION" || currentStatus === "FAILED") ? "failed" : "idle";
  }
  const nodeIdx = STATUS_ORDER.indexOf(nodeId);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx < 0) return "idle";
  if (nodeIdx === currentIdx) return "active";
  if (nodeIdx < currentIdx) return "done";
  return "idle";
}

const NODE_SIZE = 56;

export function DagVisualizer({ status }: { status: TaskStatus }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox="0 0 500 650" className="w-full max-w-lg mx-auto" aria-label="Agent pipeline DAG">
        {/* Edges */}
        {EDGES.map(([from, to]) => {
          const a = NODES.find((n) => n.id === from)!;
          const b = NODES.find((n) => n.id === to)!;
          const ax = a.x + NODE_SIZE / 2;
          const ay = a.y + NODE_SIZE;
          const bx = b.x + NODE_SIZE / 2;
          const by = b.y;
          return (
            <line
              key={`${from}-${to}`}
              x1={ax} y1={ay} x2={bx} y2={by}
              stroke="#334155" strokeWidth="2" strokeDasharray="4 3"
              markerEnd="url(#arrow)"
            />
          );
        })}

        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#475569" />
          </marker>
        </defs>

        {/* Nodes */}
        {NODES.map((node) => {
          const state = isNodeActive(node.id, status);
          const cx = node.x + NODE_SIZE / 2;
          const cy = node.y + NODE_SIZE / 2;

          const fillColor =
            state === "active" ? "#6366f1" :
            state === "done"   ? "#22c55e" :
            state === "failed" ? "#ef4444" :
            "#1e293b";

          const strokeColor =
            state === "active" ? "#818cf8" :
            state === "done"   ? "#4ade80" :
            state === "failed" ? "#f87171" :
            "#334155";

          return (
            <g key={node.id}>
              {/* Pulse ring for active node */}
              {state === "active" && (
                <circle
                  cx={cx} cy={cy}
                  r={(NODE_SIZE / 2) + 8 + (tick % 2) * 5}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2"
                  opacity={0.6 - (tick % 2) * 0.3}
                />
              )}
              <circle
                cx={cx} cy={cy}
                r={NODE_SIZE / 2}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
              />
              <text
                x={cx} y={node.y + NODE_SIZE + 18}
                textAnchor="middle"
                className="text-xs"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="system-ui, sans-serif"
              >
                {node.label}
              </text>
              <text
                x={cx} y={node.y + NODE_SIZE + 30}
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="system-ui, sans-serif"
              >
                {node.description}
              </text>
              {/* Icon / status indicator */}
              {state === "done" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="14">✓</text>
              )}
              {state === "failed" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="14">✕</text>
              )}
              {state === "active" && (
                <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="12">▶</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
