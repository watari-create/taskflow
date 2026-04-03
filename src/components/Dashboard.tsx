"use client";
import { useState, useEffect } from "react";
import { Plus, FolderKanban, Users, TrendingUp, Clock } from "lucide-react";
import type { Project, Member } from "@/types";
import { subscribeTasksByProject } from "@/lib/db";
import type { Task } from "@/types";
import { PROJECT_COLORS, progressColor } from "@/lib/utils";

interface Props {
  projects: Project[];
  members: Member[];
  onSelectProject: (id: string) => void;
  onCreateProject: (data: Omit<Project, "id"|"createdAt"|"updatedAt">) => void;
}

export default function Dashboard({ projects, members, onSelectProject, onCreateProject }: Props) {
  const [taskMap, setTaskMap] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    projects.forEach(p => {
      const unsub = subscribeTasksByProject(p.id, tasks => {
        setTaskMap(prev => ({ ...prev, [p.id]: tasks }));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [projects]);

  const totalTasks  = Object.values(taskMap).flat().length;
  const doneTasks   = Object.values(taskMap).flat().filter(t => t.status === "done").length;
  const overdueTasks = Object.values(taskMap).flat().filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;

  const projectProgress = (pid: string) => {
    const ts = taskMap[pid] ?? [];
    if (!ts.length) return 0;
    return Math.round(ts.reduce((sum, t) => sum + t.progress, 0) / ts.length);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">ダッシュボード</h1>
        <p className="text-zinc-500 text-sm mt-1">全プロジェクトの進捗サマリー</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FolderKanban size={18} className="text-brand-500"/>} label="プロジェクト" value={projects.length} color="bg-brand-50"/>
        <StatCard icon={<Users size={18} className="text-purple-500"/>} label="メンバー" value={members.length} color="bg-purple-50"/>
        <StatCard icon={<TrendingUp size={18} className="text-green-500"/>} label="完了タスク" value={doneTasks} sub={`/ ${totalTasks}`} color="bg-green-50"/>
        <StatCard icon={<Clock size={18} className="text-red-500"/>} label="期限超過" value={overdueTasks} color="bg-red-50"/>
      </div>

      {/* Projects grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900">プロジェクト一覧</h2>
        <NewProjectButton onCreateProject={onCreateProject}/>
      </div>

      {projects.length === 0 ? (
        <EmptyState onCreateProject={onCreateProject}/>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map(p => {
            const ts     = taskMap[p.id] ?? [];
            const prog   = projectProgress(p.id);
            const done   = ts.filter(t => t.status === "done").length;
            const active = ts.filter(t => t.status === "in_progress").length;
            return (
              <button key={p.id} onClick={() => onSelectProject(p.id)}
                className="card-lift text-left bg-white rounded-2xl border border-zinc-200 p-5 hover:border-zinc-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm" style={{ background: p.color }}>
                    {p.name[0]}
                  </div>
                  <span className="text-xs text-zinc-400">{ts.length} タスク</span>
                </div>
                <h3 className="font-semibold text-zinc-900 text-sm mb-1 truncate">{p.name}</h3>
                {p.description && <p className="text-xs text-zinc-400 mb-4 line-clamp-2">{p.description}</p>}
                {/* progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span>進捗</span><span className="font-medium text-zinc-600">{prog}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full progress-fill ${progressColor(prog)}`} style={{ width: `${prog}%` }}/>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-zinc-400">
                  <span className="text-green-600">✓ {done} 完了</span>
                  <span className="text-blue-500">● {active} 進行中</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-zinc-900">{value}</span>
        {sub && <span className="text-sm text-zinc-400">{sub}</span>}
      </div>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function NewProjectButton({ onCreateProject }: { onCreateProject: (d: Omit<Project,"id"|"createdAt"|"updatedAt">) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const handle = () => {
    if (!name.trim()) return;
    onCreateProject({ name: name.trim(), description: desc.trim(), color, memberIds: [] });
    setName(""); setDesc(""); setColor(PROJECT_COLORS[0]); setOpen(false);
  };

  return open ? (
    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm">
      {PROJECT_COLORS.slice(0,5).map(c => (
        <button key={c} onClick={()=>setColor(c)} className={`w-4 h-4 rounded-full ${color===c?"ring-2 ring-offset-1":""}`} style={{ background: c, ringColor: c }}/>
      ))}
      <input autoFocus value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") handle(); if(e.key==="Escape") setOpen(false); }}
        placeholder="プロジェクト名" className="text-sm border-none outline-none w-36 bg-transparent"/>
      <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="説明" className="text-sm border-none outline-none w-28 bg-transparent text-zinc-400"/>
      <button onClick={handle} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg hover:bg-brand-700">作成</button>
      <button onClick={()=>setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600">×</button>
    </div>
  ) : (
    <button onClick={()=>setOpen(true)} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700">
      <Plus size={15}/> 新規プロジェクト
    </button>
  );
}

function EmptyState({ onCreateProject }: { onCreateProject: (d: Omit<Project,"id"|"createdAt"|"updatedAt">) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-zinc-300 flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
        <FolderKanban size={24} className="text-brand-400"/>
      </div>
      <p className="text-zinc-500 text-sm">プロジェクトがまだありません</p>
      <button onClick={() => onCreateProject({ name: "新しいプロジェクト", description: "", color: PROJECT_COLORS[0], memberIds: [] })}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700">
        <Plus size={14}/> プロジェクトを作成
      </button>
    </div>
  );
}
