import type { Priority, TaskStatus } from "@/types";

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  low:      { label: "低",      color: "text-slate-500",  bg: "bg-slate-100",  dot: "bg-slate-400" },
  medium:   { label: "中",      color: "text-amber-600",  bg: "bg-amber-50",   dot: "bg-amber-400" },
  high:     { label: "高",      color: "text-orange-600", bg: "bg-orange-50",  dot: "bg-orange-500" },
  critical: { label: "緊急",    color: "text-red-600",    bg: "bg-red-50",     dot: "bg-red-500" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: "未着手",   color: "text-slate-600",  bg: "bg-slate-100" },
  in_progress: { label: "進行中",   color: "text-blue-600",   bg: "bg-blue-50" },
  review:      { label: "レビュー", color: "text-purple-600", bg: "bg-purple-50" },
  done:        { label: "完了",     color: "text-green-600",  bg: "bg-green-50" },
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

export function progressColor(p: number) {
  if (p >= 80) return "bg-green-500";
  if (p >= 50) return "bg-blue-500";
  if (p >= 20) return "bg-amber-400";
  return "bg-slate-300";
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
