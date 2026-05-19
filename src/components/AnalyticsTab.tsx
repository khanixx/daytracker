"use client"
// src/components/AnalyticsTab.tsx
import { useState, useEffect, useRef } from "react"

type AnalyticsData = {
  days: { date: string; score: number; habitsDone: number; tasksDone: number; pomos: number }[]
  totalPomos: number
  avgHabits: number
  avgTasks: number
  bestStreak: number
  categories: { work: number; health: number; personal: number }
  habitRates: { id: string; name: string; icon: string; pct: number }[]
}

export function AnalyticsTab() {
  const [range, setRange] = useState(7)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadData()
  }, [range])

  useEffect(() => {
    if (data && canvasRef.current) drawChart()
  }, [data])

  async function loadData() {
    setLoading(true)
    const res = await fetch(`/api/analytics?days=${range}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  function drawChart() {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const pad = { top: 10, right: 10, bottom: 30, left: 30 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    const isDark = document.documentElement.classList.contains("dark")
    const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"
    const barColor = "#6366f1"
    const barColorAlpha = "rgba(99,102,241,0.8)"

    ctx.clearRect(0, 0, w, h)

    const scores = data.days.map(d => d.score)
    const max = 100
    const barW = chartW / scores.length * 0.6
    const gap = chartW / scores.length

    // Grid lines
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
      ctx.fillStyle = textColor; ctx.font = "10px Manrope, sans-serif"; ctx.textAlign = "right"
      ctx.fillText(`${i * 25}%`, pad.left - 4, y + 3)
    }

    // Bars
    scores.forEach((score, i) => {
      const x = pad.left + i * gap + gap / 2 - barW / 2
      const barH = (score / max) * chartH
      const y = pad.top + chartH - barH

      // Gradient
      const grad = ctx.createLinearGradient(0, y, 0, y + barH)
      grad.addColorStop(0, barColorAlpha)
      grad.addColorStop(1, "rgba(99,102,241,0.3)")
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, 4)
      ctx.fill()

      // X label
      const d = new Date(data.days[i].date)
      ctx.fillStyle = textColor; ctx.font = "10px Manrope, sans-serif"; ctx.textAlign = "center"
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, x + barW / 2, pad.top + chartH + 16)
    })
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16" style={{ color: "var(--muted)" }}>
        <i className="ti ti-loader-2 animate-spin text-3xl" />
      </div>
    )
  }

  if (!data) return null

  const { categories } = data
  const totalCat = (categories.work + categories.health + categories.personal) || 1

  return (
    <div>
      {/* Range selector */}
      <div className="flex gap-1.5 mb-4">
        {[7, 14, 30].map(r => (
          <button key={r} onClick={() => setRange(r)}
            className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={{
              background: range === r ? "var(--accent)" : "transparent",
              color: range === r ? "#fff" : "var(--muted)",
              borderColor: range === r ? "var(--accent)" : "var(--border)",
            }}>
            {r} дней
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { val: data.avgTasks, label: "ср. задач/день", icon: "ti-list-check", color: "var(--accent)" },
          { val: data.avgHabits, label: "ср. привычек/день", icon: "ti-checkbox", color: "var(--green)" },
          { val: data.totalPomos, label: "помодоро всего", icon: "ti-clock", color: "var(--amber)" },
          { val: `${data.bestStreak}д`, label: "лучшая серия", icon: "ti-flame", color: "var(--red)" },
        ].map(({ val, label, icon, color }) => (
          <div key={label} className="card mb-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <i className={`ti ${icon} text-lg`} style={{ color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color }}>{val}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily score chart */}
      <div className="card">
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Успеваемость по дням</h3>
        <div style={{ height: 160, position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="card">
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Задачи по категориям</h3>
        <div className="space-y-3">
          {[
            { key: "work", label: "Работа", color: "#6366f1", val: categories.work },
            { key: "health", label: "Здоровье", color: "#10b981", val: categories.health },
            { key: "personal", label: "Личное", color: "#f59e0b", val: categories.personal },
          ].map(({ label, color, val }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium" style={{ color: "var(--text)" }}>{label}</span>
                <span style={{ color: "var(--muted)" }}>{val} ({Math.round(val / totalCat * 100)}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(val / totalCat * 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Habit rates */}
      {data.habitRates.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text)" }}>Привычки — выполнение</h3>
          <div className="space-y-3">
            {data.habitRates.sort((a, b) => b.pct - a.pct).map(h => (
              <div key={h.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: "var(--text)" }}>{h.icon} {h.name}</span>
                  <span style={{ color: h.pct >= 70 ? "var(--green)" : h.pct >= 40 ? "var(--amber)" : "var(--red)" }}>
                    {h.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${h.pct}%`,
                      background: h.pct >= 70 ? "var(--green)" : h.pct >= 40 ? "var(--amber)" : "var(--red)",
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
