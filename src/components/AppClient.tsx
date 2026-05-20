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
import { ProfileSetupModal } from "./ProfileSetupModal"
import { ThemeToggle }       from "./ThemeToggle"
import { signOut }           from "next-auth/react"

type Section = "productivity" | "social" | "chat"
type ProductivityTab = "habits" | "tasks" | "pomodoro" | "calendar" | "analytics" | "notes"

const PRODUCTIVITY_TABS: { id: ProductivityTab; icon: string; label: string }[] = [
  { id: "habits",    icon: "ti-checkbox",   label: "Привычки"  },
  { id: "tasks",     icon: "ti-list-check", label: "Задачи"    },
  { id: "pomodoro",  icon: "ti-clock",      label: "Фокус"     },
  { id: "calendar",  icon: "ti-calendar",   label: "Календарь" },
  { id: "analytics", icon: "ti-chart-bar",  label: "Статистика"},
  { id: "notes",     icon: "ti-notebook",   label: "Заметки"   },
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
  const [section, setSection]         = useState<Section>("productivity")
  const [prodTab, setProdTab]         = useState<ProductivityTab>("habits")
  const [score, setScore]             = useState(0)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [profile, setProfile]         = useState(user)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [chatBadge, setChatBadge]     = useState(0)

  // Считаем непрочитанные сообщения
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
    const handler = () => setSection("chat")
    window.addEventListener("open-chat", handler)
    return () => window.removeEventListener("open-chat", handler)
  }, [])

  function handleProfileSaved(data: { handle: string; name: string; bio: string; avatarColor: string }) {
    setProfile(p => ({ ...p, ...data }))
    setShowEditProfile(false)
  }

  const avatarColor = profile.avatarColor || "#6366f1"

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Модалка редактирования профиля */}
      {showEditProfile && (
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
            {section === "productivity" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{
                  background: score >= 80 ? "var(--green-subtle)"  : score >= 40 ? "var(--accent-subtle)" : "var(--amber-subtle)",
                  color:      score >= 80 ? "var(--green)"         : score >= 40 ? "var(--accent)"        : "var(--amber)",
                }}>
                <i className="ti ti-star-filled text-xs" />
                {score}%
              </div>
            )}

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
                <div className="absolute right-0 top-11 w-56 rounded-2xl overflow-hidden z-[60] animate-fade-in"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{profile.name}</p>
                    {profile.handle
                      ? <p className="text-xs" style={{ color: "var(--accent)" }}>@{profile.handle}</p>
                      : <p className="text-xs" style={{ color: "var(--muted)" }}>{profile.email}</p>}
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setShowEditProfile(true) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ background: "transparent", border: "none", color: "var(--text)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <i className="ti ti-user-edit" /> Редактировать профиль
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: "var(--red)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--red-subtle)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <i className="ti ti-logout" /> Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop section tabs — hidden on mobile */}
        <nav className="hidden sm:flex max-w-2xl mx-auto px-4 gap-1 border-b" style={{ borderColor: "var(--border)" }}>
          {([
            { id: "productivity", icon: "ti-layout-dashboard", label: "Продуктивность" },
            { id: "social",       icon: "ti-users",            label: "Люди"           },
            { id: "chat",         icon: "ti-message-circle",   label: "Чат"            },
          ] as const).map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all duration-200"
              style={{
                borderColor: section === s.id ? "var(--accent)" : "transparent",
                color:       section === s.id ? "var(--accent)" : "var(--muted)",
                background:  "transparent",
              }}>
              <i className={`ti ${s.icon} text-sm`} />
              {s.label}
              {s.id === "chat" && chatBadge > 0 && (
                <span className="w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ml-1"
                  style={{ background: "var(--red)" }}>{chatBadge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sub-tabs when in productivity */}
        {section === "productivity" && (
          <nav className="flex max-w-2xl mx-auto px-4 gap-0.5 overflow-x-auto">
            {PRODUCTIVITY_TABS.map(t => (
              <button key={t.id} onClick={() => setProdTab(t.id)}
                className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 shrink-0"
                style={{
                  borderColor: prodTab === t.id ? "var(--accent)" : "transparent",
                  color:       prodTab === t.id ? "var(--accent)" : "var(--muted)",
                  background:  "transparent",
                }}>
                <i className={`ti ${t.icon} text-sm`} />
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="main-content max-w-2xl mx-auto px-4 pt-5 pb-6 animate-fade-in">
        {section === "productivity" && (
          <>
            {prodTab === "habits"    && <HabitsTab    onScoreChange={setScore} />}
            {prodTab === "tasks"     && <TasksTab     onScoreChange={setScore} />}
            {prodTab === "pomodoro"  && <PomodoroTab  />}
            {prodTab === "calendar"  && <CalendarTab  />}
            {prodTab === "analytics" && <AnalyticsTab />}
            {prodTab === "notes"     && <NotesTab     />}
          </>
        )}
        {section === "social" && <SocialTab myId={profile.id} />}
        {section === "chat"   && <ChatTab   myId={profile.id} />}
      </main>

      {/* ── BOTTOM NAV — 3 кнопки ── */}
      <nav className="mobile-nav">
        {/* Продуктивность */}
        <button
          onClick={() => setSection("productivity")}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200"
          style={{
            color:      section === "productivity" ? "var(--accent)" : "var(--muted)",
            background: "transparent", border: "none", minHeight: "52px",
          }}>
          <i className="ti ti-layout-dashboard text-xl" />
          <span className="text-[9px] font-semibold leading-none">Продуктивность</span>
          {section === "productivity" && (
            <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
          )}
        </button>

        {/* Люди */}
        <button
          onClick={() => setSection("social")}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200"
          style={{
            color:      section === "social" ? "var(--accent)" : "var(--muted)",
            background: "transparent", border: "none", minHeight: "52px",
          }}>
          <i className="ti ti-users text-xl" />
          <span className="text-[9px] font-semibold leading-none">Люди</span>
          {section === "social" && (
            <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
          )}
        </button>

        {/* Чат */}
        <button
          onClick={() => setSection("chat")}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200"
          style={{
            color:      section === "chat" ? "var(--accent)" : "var(--muted)",
            background: "transparent", border: "none", minHeight: "52px",
          }}>
          <i className="ti ti-message-circle text-xl" />
          <span className="text-[9px] font-semibold leading-none">Чат</span>
          {chatBadge > 0 && (
            <span className="absolute top-1 right-1/4 w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: "var(--red)" }}>
              {chatBadge}
            </span>
          )}
          {section === "chat" && (
            <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
          )}
        </button>
      </nav>

      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}
