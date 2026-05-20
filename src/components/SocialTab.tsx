"use client"
// src/components/SocialTab.tsx
import { useState, useEffect, useRef } from "react"

interface UserResult {
  id: string; name: string | null; handle: string | null
  bio: string | null; avatarColor: string
}

interface PublicProfile extends UserResult {
  createdAt: string
  habits: { id: string; name: string; icon: string }[]
  habitLogs: { date: string; done: boolean }[]
  pomodoroLogs: { date: string; count: number }[]
}

// ── Утилиты ──────────────────────────────────────────────────
function Avatar({ name, color, size = 40 }: { name: string | null; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {(name || "?")?.[0]?.toUpperCase()}
    </div>
  )
}

function calcStreak(logs: { date: string; done: boolean }[]) {
  const doneSet = new Set(logs.filter(l => l.done).map(l => l.date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (doneSet.has(d.toISOString().slice(0, 10))) streak++
    else break
  }
  return streak
}

function totalPomodoro(logs: { date: string; count: number }[]) {
  return logs.reduce((s, l) => s + l.count, 0)
}

// Heatmap 56 дней (8 недель)
function Heatmap({ logs }: { logs: { date: string; done: boolean }[] }) {
  const doneSet = new Set(logs.filter(l => l.done).map(l => l.date))
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (55 - i))
    return d.toISOString().slice(0, 10)
  })
  // Weekday labels
  const DOW = ["Пн","","Ср","","Пт","","Вс"]
  return (
    <div>
      <div className="flex gap-0.5">
        {/* Дни недели */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DOW.map((d, i) => (
            <div key={i} className="w-5 h-4 flex items-center justify-end">
              <span className="text-[9px]" style={{ color: "var(--muted)" }}>{d}</span>
            </div>
          ))}
        </div>
        {/* Недели */}
        {Array.from({ length: 8 }, (_, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {days.slice(wi * 7, wi * 7 + 7).map(date => (
              <div key={date} title={date}
                className="w-4 h-4 rounded-sm transition-colors"
                style={{
                  background: doneSet.has(date) ? "var(--green)" : "var(--surface2)",
                  opacity: doneSet.has(date) ? 1 : 0.7,
                }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Профиль пользователя ─────────────────────────────────────
function ProfileView({
  profile, myId, onBack, onChat,
}: {
  profile: PublicProfile; myId: string
  onBack: () => void
  onChat: (userId: string) => void
}) {
  const [starting, setStarting] = useState(false)
  const joined = new Date(profile.createdAt).toLocaleDateString("ru-RU", {
    month: "long", year: "numeric",
  })
  const streak = calcStreak(profile.habitLogs)
  const pomo   = totalPomodoro(profile.pomodoroLogs)
  // % дней с хоть одной отмеченной привычкой за последние 30 дней
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  })
  const doneSet = new Set(profile.habitLogs.filter(l => l.done).map(l => l.date))
  const consistency = Math.round((last30.filter(d => doneSet.has(d)).length / 30) * 100)

  async function handleChat() {
    setStarting(true)
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    })
    const data = await res.json()
    setStarting(false)
    if (data.id) {
      window.dispatchEvent(new CustomEvent("open-chat", {
        detail: { convId: data.id, other: {
          id: profile.id, name: profile.name, handle: profile.handle, avatarColor: profile.avatarColor,
        }},
      }))
      onChat(profile.id)
    }
  }

  return (
    <div className="animate-slide-up">
      {/* Кнопка назад */}
      <button onClick={onBack} className="btn text-xs mb-4 gap-1.5"
        style={{ color: "var(--muted)" }}>
        <i className="ti ti-arrow-left" /> Назад к поиску
      </button>

      {/* Шапка профиля */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <Avatar name={profile.name} color={profile.avatarColor} size={68} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--text)" }}>
              {profile.name || "Без имени"}
            </h2>
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              @{profile.handle}
            </p>
            {profile.bio && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-2)" }}>
                {profile.bio}
              </p>
            )}
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              <i className="ti ti-calendar-event mr-1" />
              С нами с {joined}
            </p>
          </div>
        </div>

        {profile.id !== myId && (
          <button onClick={handleChat} disabled={starting}
            className="btn btn-primary w-full mt-4 gap-2">
            <i className="ti ti-message-circle" />
            {starting ? "Открываю чат..." : "Написать сообщение"}
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="card p-4">
        <p className="text-xs font-bold mb-3" style={{ color: "var(--muted)" }}>
          📊 Статистика
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Серия",        value: `${streak} дн`,   icon: "ti-flame",       color: "var(--amber)" },
            { label: "Помодоро",     value: pomo,              icon: "ti-clock",       color: "var(--accent)" },
            { label: "Регулярность", value: `${consistency}%`, icon: "ti-chart-line",  color: "var(--green)" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-xl gap-1"
              style={{ background: "var(--bg)" }}>
              <i className={`ti ${s.icon} text-xl`} style={{ color: s.color }} />
              <span className="text-xl font-bold" style={{ color: "var(--text)" }}>{s.value}</span>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Привычки */}
      {profile.habits.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-bold mb-3" style={{ color: "var(--muted)" }}>
            ✅ Привычки ({profile.habits.length})
          </p>
          <div className="flex gap-2 flex-wrap">
            {profile.habits.map(h => (
              <span key={h.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--surface2)", color: "var(--text-2)" }}>
                {h.icon} {h.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {profile.habitLogs.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-bold mb-3" style={{ color: "var(--muted)" }}>
            🗓️ Активность (8 недель)
          </p>
          <Heatmap logs={profile.habitLogs} />
          <div className="flex items-center justify-end gap-2 mt-2">
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>Меньше</span>
            {["var(--surface2)","var(--green)"].map((c, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
            ))}
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>Больше</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────
export function SocialTab({ myId }: { myId: string }) {
  const [query, setQuery]           = useState("")
  const [results, setResults]       = useState<UserResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [profile, setProfile]       = useState<PublicProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Поиск с debounce ────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res  = await fetch(`/api/users?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setSearching(false)
    }, 350)
  }, [query])

  async function openProfile(handle: string) {
    setLoadingProfile(true)
    const res  = await fetch(`/api/users?handle=${handle}`)
    const data = await res.json()
    setLoadingProfile(false)
    if (data.id) setProfile(data)
  }

  // ── Если открыт профиль — показываем его ────────────────
  if (profile && !loadingProfile) {
    return (
      <ProfileView
        profile={profile}
        myId={myId}
        onBack={() => setProfile(null)}
        onChat={() => {
          // AppClient переключит вкладку сам через событие open-chat
        }}
      />
    )
  }

  return (
    <div>
      {/* ── Поиск по тегу ── */}
      <div className="card">
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>
          Найти пользователя
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Введи @тег или имя — и начни общаться
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm"
            style={{ color: "var(--accent)" }}>@</span>
          <input
            className="input pl-7"
            placeholder="тег или имя..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Лоадер */}
      {searching && (
        <div className="card flex items-center gap-2 py-3">
          <i className="ti ti-loader animate-spin" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Поиск...</span>
        </div>
      )}

      {/* Загрузка профиля */}
      {loadingProfile && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="skeleton w-14 h-14 rounded-full" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          </div>
          <div className="skeleton h-24 rounded-xl" />
        </div>
      )}

      {/* Результаты поиска */}
      {!searching && results.length > 0 && (
        <div className="card p-0 overflow-hidden">
          {results.map((u, i) => (
            <button key={u.id}
              onClick={() => u.handle && openProfile(u.handle)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b last:border-b-0"
              style={{ borderColor: "var(--border)", background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Avatar name={u.name} color={u.avatarColor} size={42} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                  {u.name || "Без имени"}
                </p>
                <p className="text-xs" style={{ color: "var(--accent)" }}>@{u.handle}</p>
                {u.bio && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                    {u.bio}
                  </p>
                )}
              </div>
              <i className="ti ti-chevron-right text-sm" style={{ color: "var(--muted)" }} />
            </button>
          ))}
        </div>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <div className="card flex flex-col items-center py-8 gap-2">
          <i className="ti ti-user-search text-3xl opacity-30" style={{ color: "var(--muted)" }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Никого не нашли по «{query}»
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Попробуй другой тег или имя
          </p>
        </div>
      )}

      {/* Подсказка когда пусто */}
      {!query && (
        <div className="card flex flex-col items-center py-10 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-subtle)" }}>
            <i className="ti ti-users text-2xl" style={{ color: "var(--accent)" }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>
              Найди единомышленников
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Введи @тег или имя, посмотри чужой прогресс<br />и начни переписку
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
