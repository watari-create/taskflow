"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, X, Check, Calendar, MessageCircle, Send, ChevronDown } from "lucide-react";
import type { Project, Task, Member, Priority, TaskStatus } from "@/types";
import {
  PRIORITY_CONFIG, STATUS_CONFIG, progressColor,
  daysUntil, formatDate, initials,
} from "@/lib/utils";
import { createComment, deleteComment, subscribeCommentsByTask, type Comment } from "@/lib/db";

interface Props {
  project: Project;
  tasks: Task[];
  members: Member[];
  onUpdateProject: (id: string, d: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onCreateTask: (d: Omit<Task, "id"|"createdAt"|"updatedAt">) => void;
  onUpdateTask: (id: string, d: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

const STATUSES: TaskStatus[] = ["todo","in_progress","review","done"];

// ── コメントパネル ──────────────────────────────────────────
function CommentPanel({ task, members, onClose }: { task: Task; members: Member[]; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [authorId, setAuthorId] = useState(members[0]?.id ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeCommentsByTask(task.id, (c) => {
      setComments(c);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return unsub;
  }, [task.id]);

  const send = async () => {
    const t = text.trim();
    if (!t || !authorId) return;
    setText("");
    await createComment({ taskId: task.id, authorId, body: t });
  };

  const memberById = (id: string) => members.find(m => m.id === id);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <p className="text-xs text-zinc-400 font-medium">コメント</p>
            <h3 className="font-semibold text-zinc-800 text-sm mt-0.5 line-clamp-1">{task.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {comments.length === 0 && (
            <p className="text-center text-zinc-400 text-sm py-8">まだコメントがありません</p>
          )}
          {comments.map(c => {
            const m = memberById(c.authorId);
            return (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: m?.color ?? "#94a3b8" }}>
                  {m ? initials(m.name) : "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-zinc-700">{m?.name ?? "不明"}</span>
                    <span className="text-xs text-zinc-400">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{c.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-zinc-100">
          <div className="mb-2">
            <select
              value={authorId}
              onChange={e => setAuthorId(e.target.value)}
              className="text-xs text-zinc-500 border-none bg-transparent focus:outline-none cursor-pointer"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name} として投稿</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="コメントを入力… (Enterで送信)"
              className="flex-1 text-sm border border-zinc-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── タスクフォーム ──────────────────────────────────────────
function TaskForm({
  initial, projectId, members, onSave, onCancel,
}: {
  initial?: Task;
  projectId: string;
  members: Member[];
  onSave: (d: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");

  const submit = () => {
    if (!title.trim()) return;
    onSave({ projectId, title: title.trim(), description, status, priority, progress, assigneeId, dueDate });
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="タスク名"
        className="w-full text-sm font-medium border-b border-zinc-200 pb-2 focus:outline-none focus:border-blue-400"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="説明（任意）"
        rows={2}
        className="w-full text-sm text-zinc-500 resize-none focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 font-medium">ステータス</label>
          <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}
            className="mt-1 w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none">
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium">優先度</label>
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
            className="mt-1 w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none">
            {(["low","medium","high","urgent"] as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium">担当者</label>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
            className="mt-1 w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none">
            <option value="">未割当</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 font-medium">期限</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="mt-1 w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none" />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-zinc-400 font-medium">進捗</label>
          <span className="text-xs font-semibold text-zinc-600">{progress}%</span>
        </div>
        <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))}
          className="w-full accent-blue-500" />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-4 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
          キャンセル
        </button>
        <button onClick={submit} disabled={!title.trim()}
          className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center gap-1.5">
          <Check size={14} />
          {initial ? "更新" : "追加"}
        </button>
      </div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function ProjectView({
  project, tasks, members,
  onUpdateProject, onDeleteProject,
  onCreateTask, onUpdateTask, onDeleteTask,
}: Props) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [commentTask, setCommentTask] = useState<Task | null>(null);

  const filtered = useMemo(() =>
    filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus),
    [tasks, filterStatus]
  );

  const overallProgress = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
    : 0;

  const assignee = (id: string) => members.find(m => m.id === id);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-zinc-100"
            style={{ background: project.color + "22" }}>
            {project.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">{project.name}</h1>
            {project.description && <p className="text-sm text-zinc-400 mt-0.5">{project.description}</p>}
          </div>
        </div>
        <button onClick={() => onDeleteProject(project.id)}
          className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-xl transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      {/* 進捗サマリー */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-600">全体進捗</span>
          <span className="text-2xl font-bold text-zinc-800">{overallProgress}%</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%`, background: progressColor(overallProgress) }} />
        </div>
        <div className="flex gap-4 mt-4">
          {STATUSES.map(s => {
            const count = tasks.filter(t => t.status === s).length;
            const conf = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center gap-1.5">
                <span className="text-lg">{conf.icon}</span>
                <span className="text-xs text-zinc-500">{conf.label}</span>
                <span className="text-xs font-bold text-zinc-700">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* フィルター & 新規ボタン */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filterStatus === s
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}>
              {s === "all" ? "すべて" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowNewTask(true); setEditingTask(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus size={16} />
          タスク追加
        </button>
      </div>

      {/* 新規タスクフォーム */}
      {showNewTask && !editingTask && (
        <div className="mb-4">
          <TaskForm
            projectId={project.id}
            members={members}
            onSave={d => { onCreateTask(d); setShowNewTask(false); }}
            onCancel={() => setShowNewTask(false)}
          />
        </div>
      )}

      {/* タスクリスト */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">タスクがありません</p>
          </div>
        )}
        {filtered.map(task => {
          const pc = PRIORITY_CONFIG[task.priority];
          const sc = STATUS_CONFIG[task.status];
          const a = assignee(task.assigneeId);
          const days = task.dueDate ? daysUntil(task.dueDate) : null;
          const isOverdue = days !== null && days < 0;

          if (editingTask?.id === task.id) {
            return (
              <div key={task.id}>
                <TaskForm
                  initial={task}
                  projectId={project.id}
                  members={members}
                  onSave={d => { onUpdateTask(task.id, d); setEditingTask(null); }}
                  onCancel={() => setEditingTask(null)}
                />
              </div>
            );
          }

          return (
            <div key={task.id}
              className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: pc.bg, color: pc.color }}>
                      {pc.icon} {pc.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.color }}>
                      {sc.icon} {sc.label}
                    </span>
                    {days !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        isOverdue ? "bg-red-50 text-red-500" : "bg-zinc-50 text-zinc-500"
                      }`}>
                        <Calendar size={10} />
                        {isOverdue ? `${Math.abs(days)}日超過` : days === 0 ? "今日期限" : `残${days}日`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-800 truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  {/* 進捗バー */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${task.progress}%`, background: progressColor(task.progress) }} />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 w-8 text-right">{task.progress}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {a && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      title={a.name} style={{ background: a.color }}>
                      {initials(a.name)}
                    </div>
                  )}
                  <button onClick={() => setCommentTask(task)}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="コメント">
                    <MessageCircle size={15} className="text-zinc-400" />
                  </button>
                  <button onClick={() => { setEditingTask(task); setShowNewTask(false); }}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="編集">
                    <ChevronDown size={15} className="text-zinc-400 -rotate-90" />
                  </button>
                  <button onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="削除">
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* コメントパネル */}
      {commentTask && (
        <CommentPanel
          task={commentTask}
          members={members}
          onClose={() => setCommentTask(null)}
        />
      )}
    </div>
  );
}
