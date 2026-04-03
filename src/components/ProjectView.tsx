"use client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, MoreHorizontal, X, Check, Calendar, MessageCircle, Send } from "lucide-react";
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

export default function ProjectView({ project, tasks, members, onUpdateProject, onDeleteProject, onCreateTask, onUpdateTask, onDeleteTask }: Props) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask,  setShowNewTask]  = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [commentTask, setCommentTask] = useState<Task | null>(null);

  const filtered = useMemo(() =>
    filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus),
    [tasks, filterStatus]
  );

  const overallProgress = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl text-white font-bold text-lg flex items-center justify-center shrink-0" style={{ background: project.color }}>
            {project.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{project.name}</h1>
            {project.description && <p className="text-sm text-zinc-500 mt-0.5">{project.description}</p>}
          </div>
        </div>
        <button onClick={() => { if(confirm("プロジェクトを削除しますか？")) onDeleteProject(project.id); }}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
          <Trash2 size={13}/> 削除
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-zinc-700">全体進捗</span>
          <span className="text-2xl font-semibold text-zinc-900">{overallProgress}%</span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full progress-fill ${progressColor(overallProgress)}`} style={{ width: `${overallProgress}%` }}/>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-zinc-400">
          {STATUSES.map(s => {
            const cnt = tasks.filter(t => t.status === s).length;
            return <span key={s}><span className="font-medium text-zinc-600">{cnt}</span> {STATUS_CONFIG[s].label}</span>;
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {(["all", ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterStatus===s ? "bg-brand-600 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
              {s === "all" ? "すべて" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNewTask(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700">
          <Plus size={14}/> タスク追加
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(task => (
          <TaskRow key={task.id} task={task} members={members}
            onEdit={() => setEditingTask(task)}
            onDelete={() => onDeleteTask(task.id)}
            onProgressChange={p => onUpdateTask(task.id, { progress: p })}
            onComment={() => setCommentTask(task)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center py-14 text-zinc-400 text-sm gap-2">
            タスクはまだありません
          </div>
        )}
      </div>

      {showNewTask && (
        <TaskModal mode="create" project={project} members={members} tasks={tasks}
          onSave={d => { onCreateTask(d); setShowNewTask(false); }}
          onClose={() => setShowNewTask(false)}
        />
      )}
      {editingTask && (
        <TaskModal mode="edit" project={project} members={members} tasks={tasks} task={editingTask}
          onSave={d => { onUpdateTask(editingTask.id, d); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
      {commentTask && (
        <CommentModal task={commentTask} members={members} onClose={() => setCommentTask(null)} />
      )}
    </div>
  );
}

function TaskRow({ task, members, onEdit, onDelete, onProgressChange, onComment }:
  { task: Task; members: Member[]; onEdit: () => void; onDelete: () => void; onProgressChange: (p: number) => void; onComment: () => void }) {
  const pc = PRIORITY_CONFIG[task.priority];
  const sc = STATUS_CONFIG[task.status];
  const days = daysUntil(task.dueDate);
  const overdue = days !== null && days < 0 && task.status !== "done";
  const assignees = members.filter(m => task.assigneeIds.includes(m.id));

  return (
    <div className="card-lift bg-white rounded-xl border border-zinc-200 px-5 py-4 flex items-center gap-4">
      <div className={`w-2 h-2 rounded-full shrink-0 ${pc.dot}`}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${task.status === "done" ? "line-through text-zinc-400" : "text-zinc-900"}`}>{task.title}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pc.bg} ${pc.color}`}>{pc.label}</span>
        </div>
        {task.description && <p className="text-xs text-zinc-400 mt-0.5 truncate">{task.description}</p>}
      </div>
      <div className="w-28 shrink-0">
        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
          <span>進捗</span><span className="font-medium">{task.progress}%</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={task.progress}
          onChange={e => onProgressChange(Number(e.target.value))}
          className="w-full h-1.5 accent-brand-500"/>
      </div>
      {task.dueDate && (
        <div className={`text-[11px] shrink-0 flex items-center gap-1 ${overdue ? "text-red-500" : "text-zinc-400"}`}>
          <Calendar size={11}/>
          {formatDate(task.dueDate)}
          {days !== null && <span className="ml-0.5">({days >= 0 ? `あと${days}日` : `${Math.abs(days)}日超過`})</span>}
        </div>
      )}
      {assignees.length > 0 && (
        <div className="flex -space-x-1.5 shrink-0">
          {assignees.slice(0,3).map(m => (
            <div key={m.id} title={m.name}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-semibold"
              style={{ background: m.avatarColor }}>
              {initials(m.name)}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 shrink-0">
        <button onClick={onComment} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors" title="コメント">
          <MessageCircle size={13} className="text-zinc-400"/>
        </button>
        <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors">
          <MoreHorizontal size={14} className="text-zinc-400"/>
        </button>
        <button onClick={() => { if(confirm("タスクを削除しますか？")) onDelete(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
          <Trash2 size={13} className="text-zinc-300 hover:text-red-400"/>
        </button>
      </div>
    </div>
  );
}

function CommentModal({ task, members, onClose }: { task: Task; members: Member[]; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const unsub = subscribeCommentsByTask(task.id, setComments);
    return unsub;
  }, [task.id]);

  const handleSend = async () => {
    if (!body.trim()) return;
    await createComment({ taskId: task.id, authorName: author.trim() || "名無し", body: body.trim() });
    setBody("");
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="font-semibold text-zinc-900 text-sm">コメント</h2>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{task.title}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100">
            <X size={15} className="text-zinc-400"/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-8">まだコメントはありません</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="bg-zinc-50 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-700">{c.authorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">{new Date(c.createdAt).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => deleteComment(c.id)} className="text-[10px] text-zinc-300 hover:text-red-400">削除</button>
                </div>
              </div>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 space-y-2">
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="名前（省略可）"
            className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"/>
          <div className="flex gap-2">
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="コメントを入力..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              rows={2} className="flex-1 text-sm px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"/>
            <button onClick={handleSend} disabled={!body.trim()}
              className="px-3 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 self-end">
              <Send
