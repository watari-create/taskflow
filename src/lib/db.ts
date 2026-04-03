import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Project, Task, Member } from "@/types";

const toISO = (v: unknown): string => {
  if (!v) return new Date().toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return String(v);
};

// Projects
export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "projects"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateProject(id: string, data: Partial<Project>) {
  await updateDoc(doc(db, "projects", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteProject(id: string) { await deleteDoc(doc(db, "projects", id)); }
export function subscribeProjects(cb: (projects: Project[]) => void) {
  return onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt), updatedAt: toISO(d.data().updatedAt) } as Project)));
  });
}

// Tasks
export async function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "tasks"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateTask(id: string, data: Partial<Task>) {
  await updateDoc(doc(db, "tasks", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTask(id: string) { await deleteDoc(doc(db, "tasks", id)); }
export function subscribeTasksByProject(projectId: string, cb: (tasks: Task[]) => void) {
  return onSnapshot(
    query(collection(db, "tasks"), where("projectId", "==", projectId)),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt), updatedAt: toISO(d.data().updatedAt) } as Task))
        .sort((a, b) => a.order - b.order);
      cb(list);
    }
  );
}

// Members
// Members
export async function createMember(data: Omit<Member, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "members"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateMember(id: string, data: Partial<Member>) {
  await updateDoc(doc(db, "members", id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteMember(id: string) { await deleteDoc(doc(db, "members", id)); }
export function subscribeMembers(cb: (members: Member[]) => void) {
  return onSnapshot(query(collection(db, "members"), orderBy("name")), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt), updatedAt: toISO(d.data().updatedAt) } as Member)));
  });
}

// Comments
export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}
export async function createComment(data: Omit<Comment, "id" | "createdAt">) {
  await addDoc(collection(db, "comments"), { ...data, createdAt: serverTimestamp() });
}
export async function deleteComment(id: string) { await deleteDoc(doc(db, "comments", id)); }
export function subscribeCommentsByTask(taskId: string, cb: (comments: Comment[]) => void) {
  return onSnapshot(
    query(collection(db, "comments"), where("taskId", "==", taskId)),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Comment))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      cb(list);
    }
  );
}
