import type { Metadata } from "next";
import "./globals.css";
import { NotificationBell } from "@/components/notification-bell";

export const metadata: Metadata = {
  title: "ZorePeer — 竞品情报追踪系统",
  description: "AI-powered competitive intelligence powered by LangGraph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950 text-slate-200">
        {/* Top Nav */}
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold text-lg tracking-tight">ZorePeer</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">beta</span>
            </a>
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
