"use client"
// src/components/AppClient.tsx
import { useState, useEffect, useCallback } from "react"
import { HabitsTab }         from "./HabitsTab"
import { TasksTab }          from "./TasksTab"
import { PomodoroTab }       from "./PomodoroTab"
import { CalendarTab }       from "./CalendarTab"
import { AnalyticsTab }      from "./AnalyticsTab"
import { NotesTab }          from "./NotesTab"
import { SocialTab }         from "./SocialTab"
import { ChatTab }           from "./ChatTab"
import { ThemeToggle }       from "./ThemeToggle"
import { ProfileSetupModal } from "./ProfileSetupModal"
import { signOut }           from "next-auth/react"

type Tab = "habits" | "tasks" | "pomodoro" | "calendar" | "analytics" | "notes" | "social" | "chat"

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "habits",    icon: "ti-checkbox",      label: "Привычки"  },
  { id: "tasks",     icon: "ti-list-check",    label: "Задачи"    },
  { id: "pomodoro",  icon: "ti-clock",         label: "Фокус"     },
  { id: "calendar",  icon: "ti-calendar",      label: "Календарь" },
  { id: "analytics", icon: "ti-chart-bar",     label: "Статистика"},
  { id: "notes",     icon: "ti-notebook",      label: "Заметки"   },
  { id: "social",    icon: "ti-users",         label: "Люди"      },
  { id: "chat",      icon: "ti-message-circle",label: "Чат"       },
]

const todayKey = () => new Date().toISOString().slice(0, 10)
const fmtDate  = (d: string) =>
  new Date(d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })

interface UserData {
  id: string
  name: string
  email: string
  handle?: string | null
  avatarColor?: string
}

export function AppClient({ user }: { user: UserData }) {
  const [tab, setTab]         = useState<Tab>("habits")
  const [score, setScore]     = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState(user)
  const [showSetup, setShowSetup] = useState(!user.handle)
  const [chatBadge, setChatBadge] = useState(0)

  // Считаем непрочитанные сообщения для значка на вкладке чата
  const checkUnread = useCallback(async () => {
    const res = await fetch("/api/conversations")
    const data = await res.json()
    if (Array.isArray(data)) {
      setChatBadge(data.reduce((s: number, c: { unread: number }) => s + c.unread, 0))
    }
  }, [])

  useEffect(() => {
    checkUnread()
    const t = setInterval(checkUnread, 10000)
    return () => clearInterval(t)
  }, [checkUnread])

  // Открытие чата из SocialTab
  useEffect(() => {
    const handler = () => setTab("chat")
    window.addEventListener("open-chat", handler)
    return () => window.removeEventListener("open-chat", handler)
  }, [])

  function handleProfileSaved(data: { handle: string; name: string; bio: string; avatarColor: string }) {
    setProfile(p => ({ ...p, ...data }))
    setShowSetup(false)
  }

  const avatarColor = profile.avatarColor || "#6366f1"

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Модалка установки профиля ── */}
      {showSetup && (
        <ProfileSetupModal
          currentName={profile.name}
          onSaved={handleProfileSaved}
        />
      )}

      {/* ── HEADER ── */}
      <header style={{
        background: "var(--glass-bg)",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 40,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
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

          <div className="flex items-center gap-2">
            {/* Score pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: score >= 80 ? "var(--green-subtle)"  : score >= 40 ? "var(--accent-subtle)" : "var(--amber-subtle)",
                color:      score >= 80 ? "var(--green)"         : score >= 40 ? "var(--accent)"        : "var(--amber)",
              }}>
              <i className="ti ti-star-filled text-xs" />
              {score}%
            </div>

            <ThemeToggle />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                style={{ background: avatarColor }}>
                {profile.name[0].toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-2xl overflow-hidden z-50 animate-fade-in"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{profile.name}</p>
                    {profile.handle
                      ? <p className="text-xs" style={{ color: "var(--accent)" }}>@{profile.handle}</p>
                      : <p className="text-xs" style={{ color: "var(--muted)" }}>{profile.email}</p>}
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setShowSetup(true) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ background: "transparent", border: "none", color: "var(--text)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <i className="ti ti-user-edit" /> Редактировать профиль
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: "var(--red)", background: "transparent", border: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--red-subtle)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <i className="ti ti-logout" /> Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex max-w-2xl mx-auto px-4 gap-0.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 shrink-0"
              style={{
                borderColor: tab === t.id ? "var(--accent)" : "transparent",
                color:       tab === t.id ? "var(--accent)" : "var(--muted)",
                background:  "transparent",
              }}>
              <i className={`ti ${t.icon} text-sm`} />
              {t.label}
              {t.id === "chat" && chatBadge > 0 && (
                <span className="absolute top-1.5 right-0.5 w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: "var(--red)" }}>
                  {chatBadge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ── MAIN ── */}
      <main className="main-content max-w-2xl mx-auto px-4 pt-5 pb-6 animate-fade-in">
        {tab === "habits"    && <HabitsTab    onScoreChange={setScore} />}
        {tab === "tasks"     && <TasksTab     onScoreChange={setScore} />}
        {tab === "pomodoro"  && <PomodoroTab  />}
        {tab === "calendar"  && <CalendarTab  />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "notes"     && <NotesTab     />}
        {tab === "social"    && <SocialTab    myId={profile.id} />}
        {tab === "chat"      && <ChatTab      myId={profile.id} />}
      </main>

      {/* ── MOBILE NAV ── */}
      <nav className="mobile-nav sm:hidden">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200"
            style={{
              color:      tab === t.id ? "var(--accent)" : "var(--muted)",
              background: "transparent", border: "none", minHeight: "52px",
            }}>
            <i className={`ti ${t.icon} text-xl`} />
            <span className="text-[9px] font-semibold leading-none">{t.label}</span>
            {t.id === "chat" && chatBadge > 0 && (
              <span className="absolute top-1 right-1/4 w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: "var(--red)" }}>
                {chatBadge}
              </span>
            )}
            {tab === t.id && (
              <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
            )}
          </button>
        ))}
      </nav>

      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}
