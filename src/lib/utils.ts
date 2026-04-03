import type { Priority, TaskStatus } from "@/types";

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string; icon: string }> = {
  low:    { label: "低",   color: "text-slate-500",  bg: "bg-slate-100",  dot: "bg-slate-400",  icon: "🔵" },
  medium: { label: "中",   color: "text-amber-600",  bg: "bg-amber-50",   dot: "bg-amber-400",  icon: "🟡" },
  high:   { label: "高",   color: "text-orange-600", bg: "bg-orange-50",  dot: "bg-orange-500", icon: "🟠" },
  urgent: { label: "緊急", color: "text-red-600",    bg: "bg-red-50",     dot: "bg-red-500",    icon: "🔴" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  todo:        { label: "未着手",   color: "text-slate-600",  bg: "bg-slate-100",  icon: "⬜" },
  in_progress: { label: "進行中",   color: "text-blue-600",   bg: "bg-blue-50",    icon: "🔄" },
  review:      { label: "レビュー", color: "text-purple-600", bg: "bg-purple-50",  icon: "👀" },
  done:        { label: "完了",     color: "text-green-600",  bg: "bg-green-50",   icon: "✅" },
};

export const PROJECT_COLORS = [
  "#6366F1","#8B5CF6","#EC4899","#F43F5E",
  "#F97316","#EAB308","#22C55E","#14B8A6",
  "#3B82F6","#06B6D4",
];

export const AVATAR_COLORS = [
  "#6366F1","#8B5CF6","#EC4899","#F97316",
  "#22C55E","#14B8A6","#3B82F6","#F43F5E",
];

export function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

export function progressColor(p: number): string {
  if (p >= 80) return "#22C55E";
  if (p >= 50) return "#3B82F6";
  if (p >= 20) return "#F59E0B";
  return "#CBD5E1";
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}
