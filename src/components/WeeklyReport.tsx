"use client";
import { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertTriangle, Calendar, Users, FolderKanban, TrendingUp, XCircle, FileText } from "lucide-react";
import type { Project, Member, Task, Department } from "@/types";
import { subscribeTasksByProject, saveDailyMemo, subscribeDailyMemosByDate, type DailyMemo } from "@/lib/db";
import { progressColor, initials, formatDate, daysUntil, DEPARTMENTS, DEPARTMENT_CONFIG } from "@/lib/utils";

interface Props {
  projects: Project[];
  members: Member[];
  currentMember: Member | null;
}

type Tab = "all" | "mine" | "unachieved" | "memo";

export default function WeeklyReport({ projects, members, currentMember }: Props) {
  const [taskMap,    setTaskMap]    = useState<Record<string, Task[]>>({});
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [sentMine,   setSentMine]   = useState(false);
  const [error,      setError]      = useState("");
  const [tab,        setTab]        = useState<Tab>("all");
  const [memos,      setMemos]      = useState<DailyMemo[]>([]);
  const [myMemo,     setMyMemo]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [savedOk,    setSavedOk]    = useState(false);
  const [filterDept, setFilterDept] = useState<Department | "all">("all");

  const today = new Date().toISOString().slice(0, 10);

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

  useEffect(() => {
    const unsub = subscribeDailyMemosByDate(today, memos => {
      setMemos(memos);
      if (currentMember) {
        const mine = memos.find(m => m.memberId === currentMember.id);
        if (mine) setMyMemo(mine.body);
      }
    });
    return unsub;
  }, [today, currentMember]);

  const allTasks = Object.values(taskMap).flat();
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const todayLabel = now.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const weekLabel  = `${monday.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}〜${sunday.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`;

  const filteredProjects = filterDept === "all" ? projects : projects.filter(p => p.department === filterDept);
  const filteredTasks    = filterDept === "all" ? allTasks : allTasks.filter(t => filteredProjects.some(p => p.id === t.projectId));

  const doneTasks       = filteredTasks.filter(t => t.status === "done");
  const overdueTasks    = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done");
  const soonTasks       = filteredTasks.filter(t => { const d = daysUntil(t.dueDate); return d !== null && d >= 0 && d <= 3 && t.status !== "done"; });
  const unachievedTasks = filteredTasks.filter(t => t.status !== "done" && ((t.dueDate && new Date(t.dueDate) < now) || (t.status === "todo" && t.progress === 0)));

  const myTasks      = currentMember ? allTasks.filter(t => t.assigneeIds.includes(currentMember.id)) : [];
  const myDone       = myTasks.filter(t => t.status === "done");
  const myOverdue    = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done");
  const myInProgress = myTasks.filter(t => t.status === "in_progress");

  const projectProgress = (pid: string) => {
    const ts = taskMap[pid] ?? [];
    if (!ts.length) return 0;
    return Math.round(ts.reduce((s, t) => s + t.progress, 0) / ts.length);
  };

  const memberStats = members.map(m => ({
    member: m,
    done:       filteredTasks.filter(t => t.assigneeIds.includes(m.id) && t.status === "done").length,
    active:     filteredTasks.filter(t => t.assigneeIds.includes(m.id) && t.status === "in_progress").length,
    unachieved: filteredTasks.filter(t => t.assigneeIds.includes(m.id) && t.status !== "done" && ((t.dueDate && new Date(t.dueDate) < now) || (t.status === "todo" && t.progress === 0))).length,
  })).filter(s => s.done + s.active + s.unachieved > 0 || filterDept === "all");

  const handleSaveMemo = async () => {
    if (!currentMember || !myMemo.trim()) return;
    setSaving(true);
    await saveDailyMemo({
      memberId:    currentMember.id,
      memberName:  currentMember.name,
      avatarColor: currentMember.avatarColor,
      body:        myMemo.trim(),
      date:        today,
    });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
  };

  const buildSlackText = (mode: "all" | "mine") => {
    const bar = (pct: number) => "▓".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
    const memoLines = memos.length > 0
      ? "\n\n*📝 今日のメモ*\n" + memos.map(m => `${m.memberName}: ${m.body}`).join("\n")
      : "";
    if (mode === "mine" && currentMember) {
      const taskLines = myTasks.slice(0, 8).map(t => {
        const status = t.status === "done" ? "✅" : t.status === "in_progress" ? "🔄" : "⬜";
        return `${status} ${t.title}（${t.progress}%）`;
      }).join("\n");
      const myMemoLine = memos.find(m => m.memberId === currentMember.id);
      return [
        `📋 *${currentMember.name}の日次レポート｜${todayLabel}*`,
        "",
        `✅ 完了: *${myDone.length}件*　🔄 進行中: *${myInProgress.length}件*　⚠️ 期限超過: *${myOverdue.length}件*`,
        "",
        "*担当タスク一覧*",
        taskLines || "（担当タスクなし）",
        myMemoLine ? `\n*📝 今日のメモ*\n${myMemoLine.body}` : "",
      ].join("\n");
    }
    const deptLabel = filterDept === "all" ? "" : `【${filterDept}】`;
    const projLines = filteredProjects.map(p => `${bar(projectProgress(p.id))} ${p.name} ${projectProgress(p.id)}%`).join("\n");
    const overdueLines = overdueTasks.slice(0, 3).map(t => `• ${t.title}（${Math.abs(daysUntil(t.dueDate) ?? 0)}日超過）`).join("\n");
    const soonLines    = soonTasks.slice(0, 3).map(t => `• ${t.title}（あと${daysUntil(t.dueDate)}日）`).join("\n");
    return [
      `📊 *日次進捗レポート${deptLabel}｜${todayLabel}*`,
      "",
      `✅ 完了: *${doneTasks.length}件*　⚠️ 期限超過: *${overdueTasks.length}件*　📅 3日以内期限: *${soonTasks.length}件*`,
      "",
      "*プロジェクト進捗*",
      "```",
      projLines || "（プロジェクトなし）",
      "```",
      overdueLines ? `\n*期限超過タスク*\n${overdueLines}` : "",
      soonLines    ? `\n*もうすぐ期限*\n${soonLines}`    : "",
      memoLines,
    ].join("\n");
  };

  const handleSend = async (mode: "all" | "mine") => {
    setSending(true); setError("");
    try {
      const res = await fetch("/api/slack-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: buildSlackText(mode) }),
      });
      if (!res.ok) throw new Error();
      if (mode === "all") { setSent(true); setTimeout(() => setSent(false), 4000); }
      else                { setSentMine(true); setTimeout(() => setSentMine(false), 4000); }
    } catch {
      setError("送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">日次レポート</h1>
          <p className="text-zinc-500 text-sm mt-1">{todayLabel}（今週: {weekLabel}）</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {currentMember && (
              <button onClick={() => handleSend("mine")} disabled={sending || sentMine}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${sentMine ? "bg-green-500 text-white border-green-500" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"}`}>
                {sentMine ? <><CheckCircle2 size={14}/> 送信済み</> : <><Send size={13}/> 自分の分を送る</>}
              </button>
            )}
            <button onClick={() => handleSend("all")} disabled={sending || sent}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${sent ? "bg-green-500 text-white" : "text-white hover:opacity-90 disabled:opacity-50"}`}
              style={{ background: sent ? undefined : "#4A154B" }}>
              {sent ? <><CheckCircle2 size={14}/> 送信しました！</> : sending ? "送信中..." : <><Send size={13}/> 全体を送る</>}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {/* 部門フィルター */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs text-zinc-400 font-medium">部門:</span>
        <button onClick={() => setFilterDept("all")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterDept === "all" ? "bg-zinc-800 text-white border-zinc-800" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
          すべて
        </button>
        {DEPARTMENTS.map(d => (
          <button key={d} onClick={() => setFilterDept(d)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterDept === d ? `${DEPARTMENT_CONFIG[d].bg} ${DEPARTMENT_CONFIG[d].color} ${DEPARTMENT_CONFIG[d].border}` : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
            {d}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: "all",        label: "全体サマリー" },
          { key: "mine",       label: currentMember ? `${currentMember.name}のタスク` : "自分のタスク" },
          { key: "unachieved", label: "未達成タスク" },
          { key: "memo",       label: "📝 今日のメモ" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs px-4 py-2 rounded-lg transition-colors ${tab === t.key ? "bg-brand-600 text-white" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
            {t.label}
            {t.key === "unachieved" && unachievedTasks.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unachievedTasks.length}</span>
            )}
            {t.key === "memo" && memos.length > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">{memos.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <SummaryCard icon={<FolderKanban size={18} className="text-brand-500"/>} label="プロジェクト" value={filteredProjects.length} bg="bg-brand-50"/>
            <SummaryCard icon={<CheckCircle2 size={18} className="text-green-500"/>} label="完了タスク" value={doneTasks.length} bg="bg-green-50"/>
            <SummaryCard icon={<AlertTriangle size={18} className="text-red-500"/>} label="期限超過" value={overdueTasks.length} bg="bg-red-50" valueColor="text-red-600"/>
            <SummaryCard icon={<Calendar size={18} className="text-amber-500"/>} label="3日以内期限" value={soonTasks.length} bg="bg-amber-50" valueColor="text-amber-600"/>
          </div>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-brand-500"/> プロジェクト別進捗</h2>
              {filteredProjects.length === 0 ? <p className="text-xs text-zinc-400 py-4 text-center">プロジェクトはありません</p>
                : filteredProjects.map(p => {
                  const pct = projectProgress(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }}/>
                      <span className="text-xs text-zinc-600 w-24 truncate shrink-0">{p.name}</span>
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full progress-fill ${progressColor(pct)}`} style={{ width: `${pct}%` }}/>
                      </div>
                      <span className="text-xs font-medium text-zinc-600 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2"><Users size={15} className="text-purple-500"/> メンバー別状況</h2>
              {memberStats.length === 0 ? <p className="text-xs text-zinc-400 py-4 text-center">メンバーはいません</p>
                : memberStats.map(({ member, done, active, unachieved }) => (
                  <div key={member.id} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: member.avatarColor }}>
                      {initials(member.name)}
                    </div>
                    <span className="text-xs text-zinc-700 flex-1">{member.name}</span>
                    {member.department && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${DEPARTMENT_CONFIG[member.department].bg} ${DEPARTMENT_CONFIG[member.department].color}`}>
                        {member.department}
                      </span>
                    )}
                    <span className="text-xs text-green-600 font-medium">✓{done}</span>
                    <span className="text-xs text-blue-500 font-medium">●{active}</span>
                    {unachieved > 0 && <span className="text-xs text-red-500 font-medium">✗{unachieved}</span>}
                  </div>
                ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Slackに送られるメッセージ</h2>
            <div className="bg-[#4A154B] rounded-xl p-4">
              <p className="text-[11px] text-purple-300 mb-2 font-medium">TaskFlow Bot</p>
              <pre className="text-[11px] text-purple-100 whitespace-pre-wrap font-mono leading-relaxed">{buildSlackText("all")}</pre>
            </div>
          </div>
        </>
      )}

      {tab === "mine" && (
        <>
          {!currentMember ? (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
              <p className="text-sm">メンバーとしてログインすると自分のタスクが見られます</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <SummaryCard icon={<CheckCircle2 size={18} className="text-green-500"/>} label="完了" value={myDone.length} bg="bg-green-50"/>
                <SummaryCard icon={<TrendingUp size={18} className="text-blue-500"/>} label="進行中" value={myInProgress.length} bg="bg-blue-50"/>
                <SummaryCard icon={<AlertTriangle size={18} className="text-red-500"/>} label="期限超過" value={myOverdue.length} bg="bg-red-50" valueColor="text-red-600"/>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-5">
                <h2 className="text-sm font-semibold text-zinc-900 mb-4">担当タスク一覧</h2>
                {myTasks.length === 0 ? <p className="text-xs text-zinc-400 py-4 text-center">担当タスクはありません</p>
                  : <div className="space-y-2">
                      {myTasks.map(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        const overdue = t.dueDate && new Date(t.dueDate) < now && t.status !== "done";
                        return (
                          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${overdue ? "border-red-200 bg-red-50" : "border-zinc-100 bg-zinc-50"}`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "done" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-zinc-300"}`}/>
                            <span className={`text-xs flex-1 ${t.status === "done" ? "line-through text-zinc-400" : "text-zinc-800"}`}>{t.title}</span>
                            {proj && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-500">{proj.name}</span>}
                            <span className="text-[10px] font-medium text-zinc-500">{t.progress}%</span>
                            {t.dueDate && <span className={`text-[10px] ${overdue ? "text-red-500" : "text-zinc-400"}`}>{formatDate(t.dueDate)}</span>}
                          </div>
                        );
                      })}
                    </div>}
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-5">
                <h2 className="text-sm font-semibold text-zinc-900 mb-3">Slackに送られるメッセージ（個人）</h2>
                <div className="bg-[#4A154B] rounded-xl p-4">
                  <p className="text-[11px] text-purple-300 mb-2 font-medium">TaskFlow Bot</p>
                  <pre className="text-[11px] text-purple-100 whitespace-pre-wrap font-mono leading-relaxed">{buildSlackText("mine")}</pre>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "unachieved" && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <SummaryCard icon={<AlertTriangle size={18} className="text-red-500"/>} label="期限超過タスク" value={overdueTasks.length} bg="bg-red-50" valueColor="text-red-600"/>
            <SummaryCard icon={<XCircle size={18} className="text-zinc-400"/>} label="未着手タスク" value={filteredTasks.filter(t => t.status === "todo" && t.progress === 0).length} bg="bg-zinc-100"/>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <XCircle size={15} className="text-red-500"/> 未達成タスク一覧
              <span className="ml-auto text-xs text-zinc-400">期限超過 + 未着手のまま停止中</span>
            </h2>
            {unachievedTasks.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-zinc-400 gap-2">
                <CheckCircle2 size={32} className="text-green-400"/>
                <p className="text-sm">未達成タスクはありません 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unachievedTasks.map(t => {
                  const proj    = projects.find(p => p.id === t.projectId);
                  const assign  = members.filter(m => t.assigneeIds.includes(m.id));
                  const days    = daysUntil(t.dueDate);
                  const isOverdue = t.dueDate && new Date(t.dueDate) < now;
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isOverdue ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-100"}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? "bg-red-500" : "bg-zinc-300"}`}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-800 truncate">{t.title}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{isOverdue ? `${Math.abs(days ?? 0)}日超過` : "未着手・進捗0%"}</p>
                      </div>
                      {proj && (
                        <div className="flex items-center gap-1 shrink-0">
                          {proj.department && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${DEPARTMENT_CONFIG[proj.department].bg} ${DEPARTMENT_CONFIG[proj.department].color}`}>
                              {proj.department}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-500">{proj.name}</span>
                        </div>
                      )}
                      {assign.length > 0 && (
                        <div className="flex -space-x-1 shrink-0">
                          {assign.slice(0,2).map(m => (
                            <div key={m.id} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] border border-white" style={{ background: m.avatarColor }}>
                              {initials(m.name)}
                            </div>
                          ))}
                        </div>
                      )}
                      {t.dueDate && <span className={`text-[10px] shrink-0 ${isOverdue ? "text-red-500" : "text-zinc-400"}`}>{formatDate(t.dueDate)}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "memo" && (
        <>
          {currentMember ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold" style={{ background: currentMember.avatarColor }}>
                    {initials(currentMember.name)}
                  </div>
                  {currentMember.name} の今日のメモ
                </h2>
                <span className="text-xs text-zinc-400">{todayLabel}</span>
              </div>
              <textarea
                value={myMemo}
                onChange={e => setMyMemo(e.target.value)}
                placeholder={`今日やったこと、進捗、気になったことを書いてください...\n\n例）\n・〇〇の修正完了\n・△△の件、確認中\n・来週までに□□を仕上げる予定`}
                rows={5}
                className="w-full text-sm px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none text-zinc-800 placeholder-zinc-400"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-zinc-400">{myMemo.length} 文字</span>
                <button onClick={handleSaveMemo} disabled={saving || !myMemo.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${savedOk ? "bg-green-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"}`}>
                  {savedOk ? <><CheckCircle2 size={13}/> 保存しました！</> : saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center py-12 text-zinc-400 gap-2 mb-5">
              <FileText size={28}/>
              <p className="text-sm">メンバーとしてログインするとメモを書けます</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Users size={15} className="text-purple-500"/> チームの今日のメモ
            </h2>
            {memos.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">まだ誰もメモを書いていません</p>
            ) : (
              <div className="space-y-4">
                {memos.map(m => {
                  const member = members.find(mem => mem.id === m.memberId);
                  return (
                    <div key={m.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: m.avatarColor }}>
                        {initials(m.memberName)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-zinc-800">{m.memberName}</span>
                          {member?.department && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${DEPARTMENT_CONFIG[member.department].bg} ${DEPARTMENT_CONFIG[member.department].color}`}>
                              {member.department}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400">{new Date(m.updatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-xs text-zinc-600 bg-zinc-50 rounded-xl px-4 py-3 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, bg, valueColor = "text-zinc-900" }:
  { icon: React.ReactNode; label: string; value: number; bg: string; valueColor?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <div className={`text-2xl font-semibold ${valueColor}`}>{value}</div>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}
