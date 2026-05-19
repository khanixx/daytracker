"use client"
// src/components/CalendarTab.tsx
import { useState, useEffect } from "react"

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь",
                 "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]

type DayData = { habits: number; tasks: number; pomos: number }

export function CalendarTab() {
  const [date, setDate] = useState(new Date())
  const [calData, setCalData] = useState<Record<string, DayData>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadCalData()
  }, [date])

  async function loadCalData() {
    setLoading(true)
    const year = date.getFullYear()
    const month = date.getMonth()
    const startDate = new Date(year, month, 1).toISOString().slice(0, 10)
    const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10)

    const [habitsRes, tasksRes, pomosRes] = await Promise.all([
      fetch(`/api/habits/logs?startDate=${startDate}&endDate=${endDate}`),
      fetch(`/api/tasks?startDate=${startDate}&endDate=${endDate}`),
      fetch(`/api/pomodoro?startDate=${startDate}&endDate=${endDate}`),
    ])

    // Build a simple count by date
    const data: Record<string, DayData> = {}
    const initDay = (k: string) => { if (!data[k]) data[k] = { habits: 0, tasks: 0, pomos: 0 } }

    try {
      const hLogs = await habitsRes.json()
      if (Array.isArray(hLogs)) {
        const seen = new Set<string>()
        hLogs.forEach((l: { date: string; habitId: string }) => {
          const key = `${l.date}:${l.habitId}`
          if (!seen.has(key)) { initDay(l.date); data[l.date].habits++; seen.add(key) }
        })
      }
    } catch {}

    try {
      const tasks = await tasksRes.json()
      if (Array.isArray(tasks)) {
        tasks.filter((t: { done: boolean; date: string }) => t.done).forEach((t: { date: string }) => {
          initDay(t.date); data[t.date].tasks++
        })
      }
    } catch {}

    try {
      const pomos = await pomosRes.json()
      if (Array.isArray(pomos)) {
        pomos.forEach((p: { date: string; count: number }) => {
          initDay(p.date); data[p.date].pomos += p.count
        })
      }
    } catch {}

    setCalData(data)
    setLoading(false)
  }

  function prevMonth() { setDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const dow = (first.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  const selData = selected ? calData[selected] : null

  return (
    <div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="btn p-2 rounded-lg">
            <i className="ti ti-chevron-left" />
          </button>
          <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="btn p-2 rounded-lg">
            <i className="ti ti-chevron-right" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "var(--muted)" }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Prev month days */}
          {Array.from({ length: dow }).map((_, i) => (
            <div key={`prev-${i}`} className="p-1 text-right" style={{ minHeight: 52 }}>
              <span className="text-xs" style={{ color: "var(--border)" }}>{prevDays - dow + i + 1}</span>
            </div>
          ))}

          {/* Current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const k = new Date(year, month, day).toISOString().slice(0, 10)
            const isToday = k === todayStr
            const isSelected = k === selected
            const d = calData[k]

            return (
              <button key={day}
                onClick={() => setSelected(k === selected ? null : k)}
                className="p-1.5 rounded-xl text-left transition-all"
                style={{
                  minHeight: 52,
                  background: isSelected ? "rgba(99,102,241,0.1)" : isToday ? "rgba(99,102,241,0.05)" : "transparent",
                  border: `1px solid ${isSelected ? "var(--accent)" : isToday ? "rgba(99,102,241,0.3)" : "transparent"}`,
                }}>
                <div className="text-xs font-semibold mb-1"
                  style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>
                  {day}
                </div>
                {d && (
                  <div className="flex flex-col gap-0.5">
                    {d.habits > 0 && <div className="h-1 rounded-full" style={{ background: "var(--green)" }} />}
                    {d.tasks > 0 && <div className="h-1 rounded-full" style={{ background: "var(--accent)" }} />}
                    {d.pomos > 0 && <div className="h-1 rounded-full" style={{ background: "var(--amber)" }} />}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {[["var(--green)","Привычки"],["var(--accent)","Задачи"],["var(--amber)","Помодоро"]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <div className="w-3 h-1.5 rounded-full" style={{ background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ color: "var(--text)" }}>
              {new Date(selected + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <button onClick={() => setSelected(null)} className="btn p-1.5 rounded-lg">
              <i className="ti ti-x text-sm" />
            </button>
          </div>

          {selData && (selData.habits > 0 || selData.tasks > 0 || selData.pomos > 0) ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: selData.habits, label: "привычек", color: "var(--green)", icon: "ti-checkbox" },
                { val: selData.tasks, label: "задач", color: "var(--accent)", icon: "ti-list-check" },
                { val: selData.pomos, label: "помодоро", color: "var(--amber)", icon: "ti-clock" },
              ].map(({ val, label, color, icon }) => (
                <div key={label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg)" }}>
                  <i className={`ti ${icon} text-xl mb-1 block`} style={{ color }} />
                  <div className="text-2xl font-bold" style={{ color }}>{val}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>Нет данных за этот день</p>
          )}
        </div>
      )}
    </div>
  )
}
