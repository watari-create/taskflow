"use client";
import { useState, useEffect, useCallback } from "react";
import {
  subscribeProjects, subscribeMembers, subscribeTasksByProject,
  createProject, updateProject, deleteProject,
  createTask, updateTask, deleteTask,
  createMember, updateMember, deleteMember,
} from "@/lib/db";
import type { Project, Task, Member } from "@/types";
import { initials } from "@/lib/utils";

import Sidebar      from "./Sidebar";
import Dashboard    from "./Dashboard";
import ProjectView  from "./ProjectView";
import MemberView   from "./MemberView";
import WeeklyReport from "./WeeklyReport";

export type View = "dashboard" | "project" | "members" | "report";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [view,              setView]              = useState<View>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentMember,     setCurrentMember]     = useState<Member | null>(null);
  const [memberSelected,    setMemberSelected]    = useState(false);

  useEffect(() => {
    const unsub1 = subscribeProjects(setProjects);
    const unsub2 = subscribeMembers(setMembers);
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const unsub = subscribeTasksByProject(selectedProjectId, setTasks);
    return unsub;
  }, [selectedProjectId]);

  const handleSelectProject = useCallback((id: string) => { setSelectedProjectId(id); setView("project"); }, []);
  const handleCreateProject = useCallback(async (data: Omit<Project, "id"|"createdAt"|"updatedAt">) => {
    const id = await createProject(data); setSelectedProjectId(id); setView("project");
  }, []);
  const handleUpdateProject = useCallback((id: string, data: Partial<Project>) => updateProject(id, data), []);
  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id); setView("dashboard"); setSelectedProjectId(null);
  }, []);
  const handleCreateTask   = useCallback((data: Omit<Task, "id"|"createdAt"|"updatedAt">) => createTask(data), []);
  const handleUpdateTask   = useCallback((id: string, data: Partial<Task>) => updateTask(id, data), []);
  const handleDeleteTask   = useCallback((id: string) => deleteTask(id), []);
  const handleCreateMember = useCallback((data: Omit<Member, "id"|"createdAt">) => createMember(data), []);
  const handleUpdateMember = useCallback((id: string, data: Partial<Member>) => updateMember(id, data), []);
  const handleDeleteMember = useCallback((id: string) => deleteMember(id), []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  if (!memberSelected) {
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-900">TaskFlow</h1>
              <p className="text-xs text-zinc-400">あなたは誰ですか？</p>
            </div>
          </div>
          {members.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-zinc-400 mb-4">まだメンバーがいません</p>
              <button onClick={() => { setMemberSelected(true); setCurrentMember(null); }}
                className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700">
                ゲストとして入る
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <button key={m.id} onClick={() => { setCurrentMember(m); setMemberSelected(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ background: m.avatarColor }}>
                    {initials(m.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{m.name}</p>
                    <p className="text-xs text-zinc-400">{m.email || m.role}</p>
                  </div>
                </button>
              ))}
              <button onClick={() => { setMemberSelected(true); setCurrentMember(null); }}
                className="w-full px-4 py-2.5 rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors">
                ゲストとして入る
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F4F5]">
      <Sidebar
        projects={projects} selectedProjectId={selectedProjectId} view={view}
        currentMember={currentMember}
        onSelectProject={handleSelectProject}
        onSelectDashboard={() => setView("dashboard")}
        onSelectMembers={() => setView("members")}
        onSelectReport={() => setView("report")}
        onCreateProject={handleCreateProject}
        onSwitchMember={() => setMemberSelected(false)}
      />
      <main className="flex-1 overflow-y-auto">
        {view === "dashboard" && <Dashboard projects={projects} members={members} onSelectProject={handleSelectProject} onCreateProject={handleCreateProject}/>}
        {view === "project" && selectedProject && (
          <ProjectView project={selectedProject} tasks={tasks} members={members}
            onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject}
            onCreateTask={handleCreateTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}/>
        )}
        {view === "members" && <MemberView members={members} projects={projects} onCreateMember={handleCreateMember} onUpdateMember={handleUpdateMember} onDeleteMember={handleDeleteMember}/>}
        {view === "report"  && <WeeklyReport projects={projects} members={members} currentMember={currentMember}/>}
      </main>
    </div>
  );
}
