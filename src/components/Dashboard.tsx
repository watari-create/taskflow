"use client";
import { useState, useEffect } from "react";
import { Plus, FolderKanban, Users, TrendingUp, Clock } from "lucide-react";
import type { Project, Member, Task, Department } from "@/types";
import { subscribeTasksByProject } from "@/lib/db";
import { PROJECT_COLORS, progressColor, DEPARTMENTS, DEPARTMENT_CONFIG } from "@/lib/utils";

interface Props {
  projects: Project[];
  members: Member[];
  onSelectProject: (id: string) => void;
  onCreateProject: (data: Omit<Project, "id"|"createdAt"|"updatedAt">) => void;
}

export default function Dashboard({ projects, members, onSelectProject, onCreateProject }: Props) {
  const [taskMap,    setTaskMap]    = useState<Record<string, Task[]>>({});
  const [activeTab,  setActiveTab]  = useState<Department | "all">("all");

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

  const filteredProjects = activeTab === "all"
    ? projects
    : projects.filter(p => (p.department ?? "共通") === activeTab);

  const allTasks     = Object.values(taskMap).flat();
  const totalTasks   = allTasks.length;
  const doneTasks    = allTasks.filter(t => t.status === "done").length;
  const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;

  const projectProgress = (pid: string) => {
    const ts = taskMap[pid] ?? [];
    if (!ts.length) return 0;
    return Math.round(ts.reduce((sum, t) => sum + t.progress, 0) / ts.length);
  };

  const tabCounts = (dept: Department | "all") => {
    if (dept === "all") return projects.length;
    return projects.filter(p => (p.department ?? "共通") === dept).length;
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-zinc-900">ダッシュボード</h1>
        <p className="text-zinc-500 text-sm mt-1">全プロジェクトの進捗サマリー</p>
      </div>

      {/* 統計カード — スマホ2列・PC4列 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard icon={<FolderKanban size={16} className="text-brand-500"/>} label="プロジェクト" value={projects.length} color="bg-brand-50"/>
        <StatCard icon={<Users size={16} className="text-purple-500"/>} label="メンバー" value={members.length} color="bg-purple-50"/>
        <StatCard icon={<TrendingUp size={16} className="text-green-500"/>} label="完了タスク" value={doneTasks} sub={`/ ${totalTasks}`} color="bg-green-50"/>
        <StatCard icon={<Clock size={16} className="text-red-500"/>} label="期限超過" value={overdueTasks} color="bg-red-50"/>
      </div>

      {/* 部門タブ */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <button onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${activeTab === "all" ? "bg-zinc-800 text-white border-zinc-800" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
          すべて
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "all" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            {tabCounts("all")}
          </span>
        </button>
        {DEPARTMENTS.map(d => (
          <button key={d} onClick={() => setActiveTab(d)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${activeTab === d ? `${DEPARTMENT_CONFIG[d].bg} ${DEPARTMENT_CONFIG[d].color} ${DEPARTMENT_CONFIG[d].border}` : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
            {d}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === d ? "bg-white/40" : "bg-zinc-100 text-zinc-500"}`}>
              {tabCounts(d)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900">
          プロジェクト一覧
          <span className="ml-2 text-sm font-normal text-zinc-400">{filteredProjects.length}件</span>
        </h2>
        <NewProjectButton onCreateProject={onCreateProject}/>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
          <FolderKanban size={28}/>
          <p className="text-sm">このカテゴリにプロジェクトはありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filteredProjects.map(p => {
            const ts     = taskMap[p.id] ?? [];
            const prog   = projectProgress(p.id);
            const done   = ts.filter(t => t.status === "done").length;
            const active = ts.filter(t => t.status === "in_progress").length;
            return (
              <button key={p.id} onClick={() => onSelectProject(p.id)}
                className="card-lift text-left bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 hover:border-zinc-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: p.color }}>
                    {p.name[0]}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-zinc-400">{ts.length} タスク</span>
                    {p.department && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DEPARTMENT_CONFIG[p.department].bg} ${DEPARTMENT_CONFIG[p.department].color}`}>
                        {p.department}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-zinc-900 text-sm mb-1 truncate">{p.name}</h3>
                {p.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-1">{p.description}</p>}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>進捗</span><span className="font-medium text-zinc-600">{prog}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full progress-fill ${progressColor(prog)}`} style={{ width: `${prog}%` }}/>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-zinc-400">
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
    <div className="bg-white rounded-2xl border border-zinc-200 p-3 md:p-4">
      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${color} flex items-center justify-center mb-2 md:mb-3`}>{icon}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-semibold text-zinc-900">{value}</span>
        {sub && <span className="text-xs md:text-sm text-zinc-400">{sub}</span>}
      </div>
      <p className="text-[11px] md:text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function NewProjectButton({ onCreateProject }: { onCreateProject: (d: Omit<Project,"id"|"createdAt"|"updatedAt">) => void }) {
  const [open,       setOpen]       = useState(false);
  const [name,       setName]       = useState("");
  const [desc,       setDesc]       = useState("");
  const [color,      setColor]      = useState(PROJECT_COLORS[0]);
  const [department, setDepartment] = useState<Department>("共通");

  const handle = () => {
    if (!name.trim()) return;
    onCreateProject({ name: name.trim(), description: desc.trim(), color, department, memberIds: [] });
    setName(""); setDesc(""); setColor(PROJECT_COLORS[0]); setDepartment("共通"); setOpen(false);
  };

  return open ? (
    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
      {PROJECT_COLORS.slice(0,5).map(c => (
        <button key={c} onClick={()=>setColor(c)} className={`w-4 h-4 rounded-full ${color===c?"ring-2 ring-offset-1":""}`} style={{ background: c }}/>
      ))}
      <input autoFocus value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") handle(); if(e.key==="Escape") setOpen(false); }}
        placeholder="プロジェクト名" className="text-sm border-none outline-none w-28 bg-transparent"/>
      <select value={department} onChange={e=>setDepartment(e.target.value as Department)}
        className="text-xs border border-zinc-200 rounded-lg px-1.5 py-1 bg-white">
        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <button onClick={handle} className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg hover:bg-brand-700">作成</button>
      <button onClick={()=>setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600">×</button>
    </div>
  ) : (
    <button onClick={()=>setOpen(true)} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700">
      <Plus size={15}/> 新規
    </button>
  );
}
