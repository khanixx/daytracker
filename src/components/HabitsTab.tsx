"use client"
// src/components/HabitsTab.tsx
import { useState, useEffect, useCallback } from "react"

const todayKey = () => new Date().toISOString().slice(0, 10)

type Habit = { id: string; name: string; icon: string; streak?: number }
type HabitLog = { habitId: string; date: string; done: boolean }

const ICONS = [
  { val: "🏃", label: "Спорт" }, { val: "📚", label: "Чтение" },
  { val: "💊", label: "Здоровье" }, { val: "🧘", label: "Медитация" },
  { val: "💧", label: "Вода" }, { val: "😴", label: "Сон" },
  { val: "✏️", label: "Учёба" }, { val: "🌿", label: "Другое" },
]

function getLast7(): string[] {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export function HabitsTab({ onScoreChange }: { onScoreChange: (n: number) => void }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({})
  const [weekLogs, setWeekLogs] = useState<Record<string, string[]>>({})
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("🌿")
  const [loading, setLoading] = useState(true)
  const today = todayKey()

  const loadData = useCallback(async () => {
    const [hRes, logRes] = await Promise.all([
      fetch("/api/habits"),
      fetch(`/api/habits/logs?date=${today}`),
    ])
    const h = await hRes.json()
    setHabits(h)

    // Load today's logs and last 7 days for each habit
    const weekData: Record<string, string[]> = {}
    const todayData: Record<string, boolean> = {}

    // Fetch all logs in parallel
    await Promise.all(h.map(async (habit: Habit) => {
      const r = await fetch(`/api/habits/${habit.id}/log?days=7`)
      const logs: HabitLog[] = await r.json()
      const datesLogged = logs.filter(l => l.done).map(l => l.date)
      weekData[habit.id] = datesLogged
      if (datesLogged.includes(today)) todayData[habit.id] = true
    }))

    setWeekLogs(weekData)
    setTodayLogs(todayData)
    setLoading(false)

    // Update score
    const done = Object.keys(todayData).length
    const total = h.length
    onScoreChange(total ? Math.round(done / total * 100) : 0)
  }, [today, onScoreChange])

  useEffect(() => { loadData() }, [loadData])

  async function toggleHabit(id: string) {
    const isDone = !!todayLogs[id]
    const newDone = !isDone

    setTodayLogs(prev => ({ ...prev, [id]: newDone }))

    await fetch(`/api/habits/${id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, done: newDone }),
    })

    const done = Object.keys({ ...todayLogs, [id]: newDone }).filter(k => ({ ...todayLogs, [id]: newDone })[k]).length
    onScoreChange(habits.length ? Math.round(done / habits.length * 100) : 0)
  }

  async function addHabit() {
    const name = newName.trim()
    if (!name) return
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon: newIcon }),
    })
    if (res.ok) {
      setNewName("")
      loadData()
    }
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits/${id}`, { method: "DELETE" })
    loadData()
  }

  const last7 = getLast7()
  const doneTodayCount = Object.values(todayLogs).filter(Boolean).length

  return (
    <div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>Привычки</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {loading ? "Загрузка..." : `${doneTodayCount} из ${habits.length} сегодня`}
            </p>
          </div>
          {habits.length > 0 && (
            <div className="flex gap-1">
              {habits.map(h => (
                <div key={h.id} className="w-2 h-2 rounded-full transition-colors"
                  style={{ background: todayLogs[h.id] ? "var(--green)" : "var(--border)" }} />
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
            <i className="ti ti-loader-2 animate-spin text-2xl" />
          </div>
        ) : habits.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">🌱</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Добавьте первую привычку!</p>
          </div>
        ) : (
          <div className="space-y-0">
            {habits.map(h => {
              const isDone = !!todayLogs[h.id]
              const hWeek = weekLogs[h.id] || []
              return (
                <div key={h.id}
                  className="flex items-center gap-3 py-3 border-b last:border-0 transition-all"
                  style={{ borderColor: "var(--border)" }}>
                  {/* Check button */}
                  <button
                    onClick={() => toggleHabit(h.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: isDone ? "var(--green)" : "var(--border)",
                      background: isDone ? "var(--green)" : "transparent",
                      color: "#fff",
                    }}>
                    {isDone && <i className="ti ti-check text-xs" />}
                  </button>

                  <span className="text-xl flex-shrink-0">{h.icon}</span>

                  <span className="flex-1 text-sm font-medium truncate"
                    style={{ color: isDone ? "var(--muted)" : "var(--text)", textDecoration: isDone ? "line-through" : "none" }}>
                    {h.name}
                  </span>

                  {/* Week dots */}
                  <div className="flex gap-1 items-center">
                    {last7.map(date => (
                      <div key={date} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: hWeek.includes(date) ? "var(--green)" : "var(--border)" }} />
                    ))}
                  </div>

                  <button onClick={() => deleteHabit(h.id)}
                    className="btn btn-danger p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontSize: 12 }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add habit row */}
        <div className="flex gap-2 mt-4">
          <select
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            className="input"
            style={{ width: "auto", paddingLeft: "8px", paddingRight: "8px" }}>
            {ICONS.map(i => <option key={i.val} value={i.val}>{i.val}</option>)}
          </select>
          <input
            className="input flex-1"
            placeholder="Новая привычка..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addHabit()}
          />
          <button onClick={addHabit} className="btn btn-primary flex-shrink-0">
            <i className="ti ti-plus" />
          </button>
        </div>
      </div>
    </div>
  )
}
