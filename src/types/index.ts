export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member" | "viewer";
  color: string;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  assigneeId: string;
  dueDate: string;
  order: number; 
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
