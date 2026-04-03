export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
  avatarColor: string;
  email: string; 
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
  assigneeId: string;      // 複数→単数に統一
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
