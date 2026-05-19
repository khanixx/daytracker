"use client"
// src/components/PomodoroTab.tsx
import { useState, useEffect, useRef, useCallback } from "react"
import { useAudioSynthesizer, type Sound } from "@/hooks/useAudioSynthesizer"

const todayKey = () => new Date().toISOString().slice(0, 10)

type Mode = "work" | "short" | "long"
const MODES: Record<Mode, { label: string; color: string; defaultMin: number }> = {
  work:  { label: "Фокус",          color: "#6366f1", defaultMin: 25 },
  short: { label: "Короткий отдых", color: "#10b981", defaultMin: 5  },
  long:  { label: "Длинный отдых",  color: "#f59e0b", defaultMin: 15 },
}

const SOUNDS: { id: Sound; label: string; icon: string }[] = [
  { id: "none",   label: "Тишина",    icon: "ti-volume-off"   },
  { id: "rain",   label: "Дождь",     icon: "ti-cloud-rain"   },
  { id: "ocean",  label: "Океан",     icon: "ti-wave-sine"    },
  { id: "white",  label: "Белый шум", icon: "ti-wave-square"  },
  { id: "forest", label: "Лес",       icon: "ti-trees"        },
  { id: "cafe",   label: "Кафе",      icon: "ti-coffee"       },
]

export function PomodoroTab() {
  const [mode, setMode] = useState<Mode>("work")
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(25 * 60)
  const [total, setTotal] = useState(25 * 60)
  const [sessionsDone, setSessionsDone] = useState(0)
  const [settings, setSettings] = useState({ work: 25, short: 5, long: 15 })
  const [sound, setSound] = useState<Sound>("none")
  const [volume, setVolume] = useState(0.5)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audio = useAudioSynthesizer()

  const getDuration = useCallback(
    (m: Mode, s: typeof settings) =>
      m === "work" ? s.work * 60 : m === "short" ? s.short * 60 : s.long * 60,
    [],
  )

  // Загружаем количество сессий за сегодня
  useEffect(() => {
    fetch(`/api/pomodoro?date=${todayKey()}`)
      .then(r => r.json())
      .then(d => setSessionsDone(d.count || 0))
  }, [])

  // При смене режима или настроек — сбрасываем таймер
  useEffect(() => {
    setRunning(false)
    const dur = getDuration(mode, settings)
    setRemaining(dur)
    setTotal(dur)
  }, [mode, settings, getDuration])

  // Основной тик таймера
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(timerRef.current!)
            setRunning(false)
            handleComplete()
            return 0
          }
          return r - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // При паузе/остановке — глушим звук; при старте — возобновляем
  useEffect(() => {
    if (!running) {
      audio.stop()
    } else if (sound !== "none") {
      audio.play(sound, volume)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // Громкость обновляется без перезапуска
  useEffect(() => {
    audio.setVolume(volume)
  }, [volume, audio])

  async function handleComplete() {
    // Звуковой сигнал завершения
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
      setTimeout(() => ctx.close(), 1000)
    } catch {}

    if (mode === "work") {
      const res = await fetch("/api/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayKey() }),
      })
      const d = await res.json()
      setSessionsDone(d.count)
    }
  }

  function handleSoundChange(newSound: Sound) {
    setSound(newSound)
    if (newSound === "none") {
      audio.stop()
    } else if (running) {
      // Переключение звука прямо во время таймера
      audio.play(newSound, volume)
    }
  }

  function toggle() {
    setRunning(r => !r)
  }

  function reset() {
    setRunning(false)
    audio.stop()
    const dur = getDuration(mode, settings)
    setRemaining(dur)
    setTotal(dur)
  }

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  const pct = total > 0 ? remaining / total : 1
  const circ = 2 * Math.PI * 88
  const offset = circ * pct
  const modeColor = MODES[mode].color
  const sessionSlots = Math.max(4, Math.ceil(sessionsDone / 4) * 4)

  return (
    <div>
      <div className="card text-center">
        {/* Mode tabs */}
        <div className="flex gap-1 justify-center mb-6">
          {(Object.keys(MODES) as Mode[]).map(mk => (
            <button
              key={mk}
              onClick={() => { if (running) setRunning(false); setMode(mk) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={{
                background:   mode === mk ? modeColor : "transparent",
                color:        mode === mk ? "#fff" : "var(--muted)",
                borderColor:  mode === mk ? modeColor : "var(--border)",
              }}
            >
              {MODES[mk].label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" strokeWidth="10"
              stroke="var(--border)" />
            <circle
              cx="100" cy="100" r="88" fill="none" strokeWidth="10"
              stroke={modeColor}
              strokeDasharray={circ}
              strokeDashoffset={circ - offset}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                transition: "stroke-dashoffset 0.5s linear",
              }}
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span
              className="text-4xl font-bold tracking-wide"
              style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
            >
              {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
            <span className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {MODES[mode].label}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center mb-5">
          <button onClick={reset} className="btn w-11 h-11 rounded-full p-0">
            <i className="ti ti-refresh text-lg" />
          </button>
          <button
            onClick={toggle}
            className="btn btn-primary w-28 h-11 rounded-full text-sm font-bold"
            style={{ background: modeColor, borderColor: modeColor }}
          >
            {running
              ? <><i className="ti ti-player-pause" /> Пауза</>
              : <><i className="ti ti-player-play" /> {remaining === total ? "Старт" : "Продолжить"}</>}
          </button>
          <button className="btn w-11 h-11 rounded-full p-0" onClick={reset}>
            <i className="ti ti-player-skip-forward text-lg" />
          </button>
        </div>

        {/* Session dots */}
        <div className="flex justify-center gap-1.5 mb-1 flex-wrap px-4">
          {Array.from({ length: sessionSlots }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-colors"
              style={{ background: i < sessionsDone ? modeColor : "var(--border)" }}
            />
          ))}
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
          {sessionsDone} сессий сегодня
        </p>

        {/* Settings */}
        <div className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-xl" style={{ background: "var(--bg)" }}>
          {(["work", "short", "long"] as const).map(k => (
            <div key={k}>
              <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>
                {k === "work" ? "Фокус (мин)" : k === "short" ? "Короткий" : "Длинный"}
              </label>
              <input
                type="number" min={1} max={90}
                className="input text-center text-sm font-bold"
                value={settings[k]}
                onChange={e =>
                  setSettings(prev => ({ ...prev, [k]: parseInt(e.target.value) || prev[k] }))
                }
                style={{ padding: "6px" }}
              />
            </div>
          ))}
        </div>

        {/* Ambient sounds */}
        <div>
          <p className="text-xs font-semibold mb-2 text-left" style={{ color: "var(--muted)" }}>
            🎵 Фоновые звуки
          </p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {SOUNDS.map(snd => (
              <button
                key={snd.id}
                onClick={() => handleSoundChange(snd.id)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all"
                style={{
                  borderColor: sound === snd.id ? modeColor : "var(--border)",
                  background:  sound === snd.id ? `${modeColor}18` : "var(--bg)",
                  color:       sound === snd.id ? modeColor : "var(--muted)",
                }}
              >
                <i className={`ti ${snd.icon} text-base`} />
                {snd.label}
              </button>
            ))}
          </div>

          {sound !== "none" && (
            <div className="flex items-center gap-3">
              <i className="ti ti-volume text-sm" style={{ color: "var(--muted)" }} />
              <input
                type="range" min={0} max={1} step={0.05}
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <i className="ti ti-volume-3 text-sm" style={{ color: "var(--muted)" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
