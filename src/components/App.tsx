"use client";
import { useState, useEffect, useCallback } from "react";
import {
  subscribeProjects, subscribeMembers, subscribeTasksByProject,
  createProject, updateProject, deleteProject,
  createTask, updateTask, deleteTask,
  createMember, updateMember, deleteMember,
} from "@/lib/db";
import type { Project, Task, Member } from "@/types";
import { AVATAR_COLORS } from "@/lib/utils";

import Sidebar    from "./Sidebar";
import Dashboard  from "./Dashboard";
import ProjectView from "./ProjectView";
import MemberView from "./MemberView";

export type View = "dashboard" | "project" | "members";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);

  const [view,              setView]              = useState<View>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // subscribe projects & members
  useEffect(() => {
    const unsub1 = subscribeProjects(setProjects);
    const unsub2 = subscribeMembers(setMembers);
    return () => { unsub1(); unsub2(); };
  }, []);

  // subscribe tasks for selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    const unsub = subscribeTasksByProject(selectedProjectId, setTasks);
    return unsub;
  }, [selectedProjectId]);

  // ---- project handlers ----
  const handleSelectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setView("project");
  }, []);

  const handleCreateProject = useCallback(async (data: Omit<Project, "id"|"createdAt"|"updatedAt">) => {
    const id = await createProject(data);
    setSelectedProjectId(id);
    setView("project");
  }, []);

  const handleUpdateProject = useCallback((id: string, data: Partial<Project>) => updateProject(id, data), []);
  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setView("dashboard");
    setSelectedProjectId(null);
  }, []);

  // ---- task handlers ----
  const handleCreateTask = useCallback((data: Omit<Task, "id"|"createdAt"|"updatedAt">) => createTask(data), []);
  const handleUpdateTask = useCallback((id: string, data: Partial<Task>) => updateTask(id, data), []);
  const handleDeleteTask = useCallback((id: string) => deleteTask(id), []);

  // ---- member handlers ----
  const handleCreateMember = useCallback((data: Omit<Member, "id"|"createdAt">) => createMember(data), []);
  const handleUpdateMember = useCallback((id: string, data: Partial<Member>) => updateMember(id, data), []);
  const handleDeleteMember = useCallback((id: string) => deleteMember(id), []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F4F5]">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        view={view}
        onSelectProject={handleSelectProject}
        onSelectDashboard={() => setView("dashboard")}
        onSelectMembers={() => setView("members")}
        onCreateProject={handleCreateProject}
      />

      <main className="flex-1 overflow-y-auto">
        {view === "dashboard" && (
          <Dashboard
            projects={projects}
            members={members}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
          />
        )}
        {view === "project" && selectedProject && (
          <ProjectView
            project={selectedProject}
            tasks={tasks}
            members={members}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {view === "members" && (
          <MemberView
            members={members}
            projects={projects}
            onCreateMember={handleCreateMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
          />
        )}
      </main>
    </div>
  );
}
