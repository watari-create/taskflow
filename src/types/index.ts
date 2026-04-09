export type Priority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Department = "宗徧流" | "UCI" | "山田家" | "共通";

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: "owner" | "member" | "viewer";
  department?: Department;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  assigneeIds: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  department?: Department;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
