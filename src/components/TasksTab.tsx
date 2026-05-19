"use client"
// src/components/TasksTab.tsx
import { useState, useEffect, useCallback } from "react"

const todayKey = () => new Date().toISOString().slice(0, 10)

type Task = { id: string; name: string; category: string; priority: string; done: boolean; date: string }

const PRIO_COLORS: Record<string, string> = { high: "var(--red)", med: "var(--amber)", low: "var(--green)" }
const CAT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  work: { bg: "#eef2ff", color: "#4f46e5", label: "Работа" },
  health: { bg: "#ecfdf5", color: "#10b981", label: "Здоровье" },
  personal: { bg: "#fffbeb", color: "#f59e0b", label: "Личное" },
}

export function TasksTab({ onScoreChange }: { onScoreChange: (n: number) => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newCat, setNewCat] = useState("personal")
  const [newPrio, setNewPrio] = useState("med")
  const today = todayKey()

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?date=${today}`)
    const data = await res.json()
    setTasks(data)
    setLoading(false)
    const done = data.filter((t: Task) => t.done).length
    onScoreChange(data.length ? Math.round(done / data.length * 100) : 0)
  }, [today, onScoreChange])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function toggleTask(id: string, done: boolean) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    })
    loadTasks()
  }

  async function addTask() {
    const name = newName.trim()
    if (!name) return
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: newCat, priority: newPrio, date: today }),
    })
    setNewName("")
    loadTasks()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    loadTasks()
  }

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const po: Record<string, number> = { high: 0, med: 1, low: 2 }
    return po[a.priority] - po[b.priority]
  })

  const done = tasks.filter(t => t.done).length

  return (
    <div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>Задачи</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {loading ? "Загрузка..." : `${done} из ${tasks.length} выполнено`}
            </p>
          </div>
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${tasks.length ? Math.round(done / tasks.length * 100) : 0}%`, background: "var(--accent)" }} />
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
            <i className="ti ti-loader-2 animate-spin text-2xl" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Нет задач на сегодня</p>
          </div>
        ) : (
          <div>
            {sorted.map(t => {
              const cat = CAT_STYLES[t.category] || CAT_STYLES.personal
              return (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}>
                  {/* Priority indicator */}
                  <div className="w-1.5 h-6 rounded-full flex-shrink-0"
                    style={{ background: PRIO_COLORS[t.priority] }} />

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(t.id, t.done)}
                    className="flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: t.done ? "var(--accent)" : "var(--border)",
                      background: t.done ? "var(--accent)" : "transparent",
                      color: "#fff",
                    }}>
                    {t.done && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                  </button>

                  <span className="flex-1 text-sm font-medium"
                    style={{
                      color: t.done ? "var(--muted)" : "var(--text)",
                      textDecoration: t.done ? "line-through" : "none",
                    }}>
                    {t.name}
                  </span>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: cat.bg, color: cat.color }}>
                    {cat.label}
                  </span>

                  <button onClick={() => deleteTask(t.id)} className="btn btn-danger p-1.5 rounded-lg" style={{ fontSize: 12 }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add task */}
        <div className="flex flex-wrap gap-2 mt-4">
          <input
            className="input flex-1 min-w-0"
            placeholder="Новая задача..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            style={{ minWidth: "120px" }}
          />
          <select value={newCat} onChange={e => setNewCat(e.target.value)}
            className="input" style={{ width: "auto" }}>
            <option value="work">Работа</option>
            <option value="health">Здоровье</option>
            <option value="personal">Личное</option>
          </select>
          <select value={newPrio} onChange={e => setNewPrio(e.target.value)}
            className="input" style={{ width: "auto" }}>
            <option value="high">🔴 Высокий</option>
            <option value="med">🟡 Средний</option>
            <option value="low">🟢 Низкий</option>
          </select>
          <button onClick={addTask} className="btn btn-primary flex-shrink-0">
            <i className="ti ti-plus" /> Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
