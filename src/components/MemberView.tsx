"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2, X, Check, Mail, Shield } from "lucide-react";
import type { Member, Project } from "@/types";
import { initials, AVATAR_COLORS } from "@/lib/utils";

interface Props {
  members: Member[];
  projects: Project[];
  onCreateMember: (data: Omit<Member, "id"|"createdAt">) => void;
  onUpdateMember: (id: string, d: Partial<Member>) => void;
  onDeleteMember: (id: string) => void;
}

const ROLES: Member["role"][] = ["owner", "member", "viewer"];
const ROLE_LABELS: Record<Member["role"], string> = { owner: "オーナー", member: "メンバー", viewer: "閲覧者" };
const ROLE_COLOR: Record<Member["role"], string> = {
  owner:  "bg-amber-50 text-amber-700",
  member: "bg-brand-50 text-brand-700",
  viewer: "bg-zinc-100 text-zinc-500",
};

export default function MemberView({ members, projects, onCreateMember, onUpdateMember, onDeleteMember }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">メンバー管理</h1>
          <p className="text-zinc-500 text-sm mt-1">{members.length} 名のメンバー</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700">
          <Plus size={14}/> メンバーを追加
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-300 flex flex-col items-center justify-center py-20 gap-4 text-zinc-400">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-2xl">👤</div>
          <p className="text-sm">メンバーはまだいません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {members.map(m => {
            const memberProjects = projects.filter(p => p.memberIds.includes(m.id));
            return (
              <div key={m.id} className="card-lift bg-white rounded-2xl border border-zinc-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ background: m.avatarColor }}>
                      {initials(m.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-900">{m.name}</p>
                      <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10}/> {m.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditTarget(m)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 transition-colors">
                      <Edit2 size={13} className="text-zinc-400"/>
                    </button>
                    <button onClick={() => { if(confirm(`${m.name} を削除しますか？`)) onDeleteMember(m.id); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                      <Trash2 size={13} className="text-zinc-300 hover:text-red-400"/>
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${ROLE_COLOR[m.role]}`}>
                    <Shield size={9}/> {ROLE_LABELS[m.role]}
                  </span>
                  {memberProjects.slice(0,3).map(p => (
                    <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500" style={{ borderLeft: `3px solid ${p.color}` }}>
                      {p.name}
                    </span>
                  ))}
                  {memberProjects.length > 3 && (
                    <span className="text-[11px] text-zinc-400">+{memberProjects.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showModal || editTarget) && (
        <MemberModal
          member={editTarget ?? undefined}
          projects={projects}
          onSave={d => {
            if (editTarget) {
              onUpdateMember(editTarget.id, d);
              setEditTarget(null);
            } else {
              onCreateMember(d as Omit<Member,"id"|"createdAt"|"updatedAt">);
              setShowModal(false);
            }
          }}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

function MemberModal({ member, projects, onSave, onClose }:
  { member?: Member; projects: Project[];
    onSave: (d: Partial<Member>) => void; onClose: () => void }) {
  const [name,  setName]  = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role,  setRole]  = useState<Member["role"]>(member?.role ?? "member");
  const [color, setColor] = useState(member?.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), email: email.trim(), role, avatarColor: color, color });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">{member ? "メンバーを編集" : "メンバーを追加"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100">
            <X size={15} className="text-zinc-400"/>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
              style={{ background: color }}>
              {name ? initials(name) : "?"}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}/>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">名前 *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus
              placeholder="山田 太郎" className="input"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="taro@example.com" className="input"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">ロール</label>
            <select value={role} onChange={e => setRole(e.target.value as Member["role"])} className="input">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl">キャンセル</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-40">
            <Check size={14}/> {member ? "保存" : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
