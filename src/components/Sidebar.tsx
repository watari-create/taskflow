"use client";
import { useState } from "react";
import {
  LayoutDashboard, Users, Plus, FolderKanban,
  ChevronRight, X, Check, BarChart2, LogOut
} from "lucide-react";
import type { Project, Member } from "@/types";
import type { View } from "./App";
import { PROJECT_COLORS, initials } from "@/lib/utils";

interface Props {
  projects: Project[];
  selectedProjectId: string | null;
  view: View;
  currentMember: Member | null;
  onSelectProject: (id: string) => void;
  onSelectDashboard: () => void;
  onSelectMembers: () => void;
  onSelectReport: () => void;
  onCreateProject: (data: Omit<Project, "id"|"createdAt"|"updatedAt">) => void;
  onSwitchMember: () => void;
}

export default function Sidebar({ projects, selectedProjectId, view, currentMember, onSelectProject, onSelectDashboard, onSelectMembers, onSelectReport, onCreateProject, onSwitchMember }: Props) {
  const [creating, setCreating] = useState(false);
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateProject({ name: name.trim(), description: desc.trim(), color, memberIds: [] });
    setName(""); setDesc(""); setColor(PROJECT_COLORS[0]); setCreating(false);
  };

  return (
    <aside className="w-[240px] h-full bg-white border-r border-zinc-200 flex flex-col select-none shrink-0">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <FolderKanban size={14} className="text-white"/>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-zinc-900">TaskFlow</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {currentMember ? (
              <>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  style={{ background: currentMember.avatarColor }}>
                  {initials(currentMember.name)}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-800">{currentMember.name}</p>
                  <p className="text-[10px] text-zinc-400">ログイン中</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-[10px]">G</div>
                <p className="text-xs text-zinc-400">ゲスト</p>
              </>
            )}
          </div>
          <button onClick={onSwitchMember} title="メンバー切り替え"
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors">
            <LogOut size={12} className="text-zinc-400"/>
          </button>
        </div>
      </div>

      <nav className="px-3 py-3 space-y-0.5">
        <NavItem icon={<LayoutDashboard size={15}/>} label="ダッシュボード" active={view==="dashboard"} onClick={onSelectDashboard}/>
        <NavItem icon={<Users size={15}/>} label="メンバー管理" active={view==="members"} onClick={onSelectMembers}/>
        <NavItem icon={<BarChart2 size={15}/>} label="週次レポート" active={view==="report"} onClick={onSelectReport}/>
      </nav>

      <div className="px-3 mt-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Projects</span>
          <button onClick={() => setCreating(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-zinc-100 transition-colors">
            <Plus size={13} className="text-zinc-500"/>
          </button>
        </div>
        <div className="space-y-0.5">
          {projects.map(p => (
            <button key={p.id} onClick={() => onSelectProject(p.id)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors group ${selectedProjectId===p.id ? "bg-brand-50 text-brand-700" : "hover:bg-zinc-50 text-zinc-600"}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }}/>
              <span className="text-[13px] truncate flex-1">{p.name}</span>
              <ChevronRight size={12} className={`shrink-0 transition-opacity ${selectedProjectId===p.id ? "opacity-60" : "opacity-0 group-hover:opacity-30"}`}/>
            </button>
          ))}
        </div>

        {creating && (
          <div className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
            <input autoFocus value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") handleCreate(); if(e.key==="Escape") setCreating(false); }}
              placeholder="プロジェクト名" className="w-full text-[13px] px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"/>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              placeholder="説明（任意）" className="w-full text-[13px] px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"/>
            <div className="flex gap-1 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={()=>setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${color===c?"scale-125 ring-2 ring-offset-1":"hover:scale-110"}`}
                  style={{ background: c }}/>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleCreate} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand-600 text-white text-[12px] font-medium rounded-lg hover:bg-brand-700">
                <Check size={12}/> 作成
              </button>
              <button onClick={()=>setCreating(false)} className="flex items-center justify-center px-2.5 py-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-100">
                <X size={12} className="text-zinc-400"/>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-zinc-100">
        <p className="text-[11px] text-zinc-400">Firebase + Vercel</p>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] transition-colors ${active ? "bg-brand-50 text-brand-700 font-medium" : "text-zinc-600 hover:bg-zinc-50"}`}>
      {icon} {label}
    </button>
  );
}
