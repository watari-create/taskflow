// Daily Memos
export interface DailyMemo {
  id: string;
  memberId: string;
  memberName: string;
  avatarColor: string;
  body: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveDailyMemo(data: Omit<DailyMemo, "id" | "createdAt" | "updatedAt">) {
  const existing = await getDocs(
    query(collection(db, "dailyMemos"),
      where("memberId", "==", data.memberId),
      where("date", "==", data.date)
    )
  );
  if (!existing.empty) {
    await updateDoc(doc(db, "dailyMemos", existing.docs[0].id), {
      ...data, updatedAt: serverTimestamp(),
    });
    return existing.docs[0].id;
  }
  const ref = await addDoc(collection(db, "dailyMemos"), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeDailyMemosByDate(date: string, cb: (memos: DailyMemo[]) => void) {
  return onSnapshot(
    query(collection(db, "dailyMemos"), where("date", "==", date)),
    snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt), updatedAt: toISO(d.data().updatedAt) } as DailyMemo))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      cb(list);
    }
  );
}
