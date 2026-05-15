import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZorePeer — 竞品情报追踪系统",
  description: "AI-powered competitive intelligence powered by LangGraph",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
