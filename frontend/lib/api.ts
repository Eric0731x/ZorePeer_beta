const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "PENDING" | "PLANNING" | "COLLECTING" | "ANALYZING"
  | "QA_REVIEW" | "WRITING" | "MEMORY_SYNC"
  | "COMPLETED" | "COMPLETED_NO_UPDATE" | "FAILED" | "FAILED_COLLECTION";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  competitor_name: string;
  focus_areas: string[] | null;
  status: TaskStatus;
  report_content: string | null;
  error_reason: string | null;
  langsmith_trace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: TaskStatus;
  error_reason: string | null;
  langsmith_trace_id: string | null;
}

export interface Notification {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export const api = {
  workspaces: {
    list: () => request<Workspace[]>("/api/v1/workspaces"),
    create: (name: string, description?: string) =>
      request<Workspace>("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      }),
    get: (id: string) => request<Workspace>(`/api/v1/workspaces/${id}`),
  },
  tasks: {
    list: (workspaceId: string) =>
      request<Task[]>(`/api/v1/workspaces/${workspaceId}/tasks`),
    create: (workspaceId: string, competitorName: string, focusAreas?: string[]) =>
      request<Task>(`/api/v1/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ competitor_name: competitorName, focus_areas: focusAreas }),
      }),
    getStatus: (taskId: string) =>
      request<TaskStatusResponse>(`/api/v1/tasks/${taskId}/status`),
    get: (taskId: string) => request<Task>(`/api/v1/tasks/${taskId}`),
  },
  notifications: {
    list: (workspaceId?: string, unreadOnly?: boolean) => {
      const params = new URLSearchParams();
      if (workspaceId) params.set("workspace_id", workspaceId);
      if (unreadOnly) params.set("unread_only", "true");
      return request<Notification[]>(`/api/v1/notifications?${params}`);
    },
    markRead: (id: string) =>
      request<Notification>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
  },
  export: {
    latex: async (taskId: string): Promise<Blob> => {
      const res = await fetch(`${BASE}/api/v1/tasks/${taskId}/export/latex`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Export API ${res.status}: ${text}`);
      }
      return res.blob();
    },
  },
};
