"use client"
// src/components/AppClient.tsx
import { useState, useCallback } from "react"
import { HabitsTab } from "./HabitsTab"
import { TasksTab } from "./TasksTab"
import { PomodoroTab } from "./PomodoroTab"
import { CalendarTab } from "./CalendarTab"
import { AnalyticsTab } from "./AnalyticsTab"
import { signOut } from "next-auth/react"

type Tab = "habits" | "tasks" | "pomodoro" | "calendar" | "analytics"

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "habits", icon: "ti-checkbox", label: "Привычки" },
  { id: "tasks", icon: "ti-list-check", label: "Задачи" },
  { id: "pomodoro", icon: "ti-clock", label: "Фокус" },
  { id: "calendar", icon: "ti-calendar", label: "Календарь" },
  { id: "analytics", icon: "ti-chart-bar", label: "Статистика" },
]

const todayKey = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })

export function AppClient({ user }: { user: { name: string; email: string } }) {
  const [tab, setTab] = useState<Tab>("habits")
  const [score, setScore] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* TOP HEADER */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div>
            <p className="text-xs font-medium capitalize" style={{ color: "var(--muted)" }}>
              {fmtDate(todayKey())}
            </p>
            <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>
              Мой день
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Day score pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: score >= 80 ? "rgba(16,185,129,0.12)" : score >= 40 ? "rgba(99,102,241,0.12)" : "rgba(245,158,11,0.12)",
                color: score >= 80 ? "var(--green)" : score >= 40 ? "var(--accent)" : "var(--amber)",
              }}>
              <i className="ti ti-star-filled text-xs" />
              {score}%
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: "var(--accent)" }}>
                {user.name[0].toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 w-48 rounded-xl overflow-hidden z-50"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{user.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{user.email}</p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-surface2"
                    style={{ color: "var(--red)" }}>
                    <i className="ti ti-logout" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop tab nav */}
        <nav className="hidden sm:flex max-w-2xl mx-auto px-4 pb-0 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all"
              style={{
                borderColor: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "var(--accent)" : "var(--muted)",
                background: "transparent",
              }}>
              <i className={`ti ${t.icon} text-base`} />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="main-content max-w-2xl mx-auto px-4 pt-5 pb-6 animate-fade-in">
        {tab === "habits" && <HabitsTab onScoreChange={setScore} />}
        {tab === "tasks" && <TasksTab onScoreChange={setScore} />}
        {tab === "pomodoro" && <PomodoroTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav sm:hidden">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1 transition-all"
            style={{ color: tab === t.id ? "var(--accent)" : "var(--muted)", background: "transparent", border: "none" }}>
            <i className={`ti ${t.icon} text-xl`} />
            <span className="text-[10px] font-semibold">{t.label}</span>
            {tab === t.id && (
              <div className="w-4 h-0.5 rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </button>
        ))}
      </nav>

      {/* Backdrop for menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  )
}
