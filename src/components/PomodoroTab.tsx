"use client"
// src/components/PomodoroTab.tsx
import { useState, useEffect, useRef, useCallback } from "react"

const todayKey = () => new Date().toISOString().slice(0, 10)

type Mode = "work" | "short" | "long"
const MODES: Record<Mode, { label: string; color: string; defaultMin: number }> = {
  work:  { label: "Фокус", color: "#6366f1", defaultMin: 25 },
  short: { label: "Короткий отдых", color: "#10b981", defaultMin: 5 },
  long:  { label: "Длинный отдых", color: "#f59e0b", defaultMin: 15 },
}

type Sound = "none" | "rain" | "ocean" | "white" | "forest" | "cafe"
const SOUNDS: { id: Sound; label: string; icon: string }[] = [
  { id: "none",   label: "Тишина",  icon: "ti-volume-off" },
  { id: "rain",   label: "Дождь",   icon: "ti-cloud-rain" },
  { id: "ocean",  label: "Океан",   icon: "ti-wave-sine" },
  { id: "white",  label: "Белый шум", icon: "ti-wave-square" },
  { id: "forest", label: "Лес",     icon: "ti-trees" },
  { id: "cafe",   label: "Кафе",    icon: "ti-coffee" },
]

/* ── Web Audio ambient sound generator ── */
class AmbientAudio {
  ctx: AudioContext | null = null
  nodes: AudioNode[] = []
  masterGain: GainNode | null = null

  start(type: Sound, volume: number) {
    this.stop()
    if (type === "none") return

    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = volume
    this.masterGain.connect(this.ctx.destination)

    switch (type) {
      case "white": this.makeWhiteNoise(); break
      case "rain":  this.makeRain(); break
      case "ocean": this.makeOcean(); break
      case "forest": this.makeForest(); break
      case "cafe":  this.makeCafe(); break
    }
  }

  private makeWhiteNoise() {
    if (!this.ctx || !this.masterGain) return
    const bufLen = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 2000

    src.connect(filter)
    filter.connect(this.masterGain)
    src.start()
    this.nodes = [src, filter]
  }

  private makeRain() {
    if (!this.ctx || !this.masterGain) return
    // White noise base (higher pitched for rain)
    const bufLen = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf; src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 3500
    filter.Q.value = 0.5

    // LFO for rain variation
    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.frequency.value = 0.3
    lfoGain.gain.value = 0.3
    lfo.connect(lfoGain)
    lfoGain.connect(this.masterGain.gain as unknown as AudioNode)
    lfo.start()

    src.connect(filter)
    filter.connect(this.masterGain)
    src.start()
    this.nodes = [src, filter, lfo]
  }

  private makeOcean() {
    if (!this.ctx || !this.masterGain) return
    const bufLen = this.ctx.sampleRate * 4
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf; src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = 800

    // Slow wave LFO
    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.frequency.value = 0.12
    lfoGain.gain.value = 600
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()

    src.connect(filter)
    filter.connect(this.masterGain)
    src.start()
    this.nodes = [src, filter, lfo]
  }

  private makeForest() {
    if (!this.ctx || !this.masterGain) return
    // Light wind + birds suggestion
    const bufLen = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf; src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = "highpass"
    filter.frequency.value = 400

    const filter2 = this.ctx.createBiquadFilter()
    filter2.type = "lowpass"
    filter2.frequency.value = 2000

    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.frequency.value = 0.2
    lfoGain.gain.value = 0.15
    lfo.connect(lfoGain)
    lfoGain.connect(this.masterGain.gain as unknown as AudioNode)
    lfo.start()

    src.connect(filter)
    filter.connect(filter2)
    filter2.connect(this.masterGain)
    src.start()
    this.nodes = [src, filter, filter2, lfo]
  }

  private makeCafe() {
    if (!this.ctx || !this.masterGain) return
    // Brown noise simulating cafe chatter
    const bufLen = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(2, bufLen, this.ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1
        d[i] = last = (last + 0.02 * white) / 1.02
        d[i] *= 3.5
      }
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf; src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 1200
    filter.Q.value = 0.3

    src.connect(filter)
    filter.connect(this.masterGain)
    src.start()
    this.nodes = [src, filter]
  }

  setVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = v
  }

  stop() {
    this.nodes.forEach(n => { try { (n as OscillatorNode | AudioBufferSourceNode).stop?.() } catch {} })
    this.nodes = []
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }
}

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
  const audioRef = useRef(new AmbientAudio())

  const getDuration = useCallback((m: Mode, s: typeof settings) =>
    m === "work" ? s.work * 60 : m === "short" ? s.short * 60 : s.long * 60, [])

  // Load today's pomodoro count
  useEffect(() => {
    fetch(`/api/pomodoro?date=${todayKey()}`)
      .then(r => r.json())
      .then(d => setSessionsDone(d.count || 0))
  }, [])

  useEffect(() => {
    const dur = getDuration(mode, settings)
    setRemaining(dur)
    setTotal(dur)
  }, [mode, settings, getDuration])

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
  }, [running])

  async function handleComplete() {
    // Play completion sound
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(); osc.stop(ctx.currentTime + 0.8)
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

  function toggle() {
    setRunning(r => !r)
  }

  function reset() {
    setRunning(false)
    const dur = getDuration(mode, settings)
    setRemaining(dur)
    setTotal(dur)
  }

  // Sound controls
  useEffect(() => {
    if (sound !== "none") {
      audioRef.current.start(sound, volume)
    } else {
      audioRef.current.stop()
    }
    return () => {}
  }, [sound])

  useEffect(() => {
    audioRef.current.setVolume(volume)
  }, [volume])

  useEffect(() => {
    return () => { audioRef.current.stop() }
  }, [])

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
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button key={m}
              onClick={() => { if (running) toggle(); setMode(m) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={{
                background: mode === m ? modeColor : "transparent",
                color: mode === m ? "#fff" : "var(--muted)",
                borderColor: mode === m ? modeColor : "var(--border)",
              }}>
              {MODES[m].label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" strokeWidth="10"
              stroke="var(--border)" strokeDasharray={circ} strokeDashoffset="0" />
            <circle cx="100" cy="100" r="88" fill="none" strokeWidth="10"
              stroke={modeColor} strokeDasharray={circ} strokeDashoffset={circ - offset}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s linear" }} />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold tracking-wide" style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
            <span className="text-xs mt-1" style={{ color: "var(--muted)" }}>{MODES[mode].label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center mb-5">
          <button onClick={reset} className="btn w-11 h-11 rounded-full p-0">
            <i className="ti ti-refresh text-lg" />
          </button>
          <button onClick={toggle}
            className="btn btn-primary w-28 h-11 rounded-full text-sm font-bold"
            style={{ background: modeColor, borderColor: modeColor }}>
            {running
              ? <><i className="ti ti-player-pause" /> Пауза</>
              : <><i className="ti ti-player-play" /> {remaining === total ? "Старт" : "Продолжить"}</>}
          </button>
          <button className="btn w-11 h-11 rounded-full p-0"
            onClick={() => { setRunning(false); reset() }}>
            <i className="ti ti-player-skip-forward text-lg" />
          </button>
        </div>

        {/* Session dots */}
        <div className="flex justify-center gap-1.5 mb-1 flex-wrap px-4">
          {Array.from({ length: sessionSlots }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full transition-colors"
              style={{ background: i < sessionsDone ? modeColor : "var(--border)" }} />
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
                onChange={e => setSettings(prev => ({ ...prev, [k]: parseInt(e.target.value) || prev[k] }))}
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
            {SOUNDS.map(s => (
              <button key={s.id}
                onClick={() => setSound(s.id)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all"
                style={{
                  borderColor: sound === s.id ? modeColor : "var(--border)",
                  background: sound === s.id ? `${modeColor}15` : "var(--bg)",
                  color: sound === s.id ? modeColor : "var(--muted)",
                }}>
                <i className={`ti ${s.icon} text-base`} />
                {s.label}
              </button>
            ))}
          </div>

          {sound !== "none" && (
            <div className="flex items-center gap-3">
              <i className="ti ti-volume text-sm" style={{ color: "var(--muted)" }} />
              <input type="range" min={0} max={1} step={0.05}
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
