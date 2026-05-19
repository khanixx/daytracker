// src/hooks/useAudioSynthesizer.ts
"use client"
import { useRef, useCallback, useEffect } from "react"

export type Sound = "none" | "rain" | "ocean" | "white" | "forest" | "cafe"

interface AudioState {
  ctx: AudioContext
  masterGain: GainNode
  sources: (AudioBufferSourceNode | OscillatorNode)[]
  lfoSources: OscillatorNode[]
}

// ── Генераторы шума ─────────────────────────────────────────
function makeWhiteBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// Розовый шум (метод Voss–McCartney)
function makePinkBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buf
}

// Коричневый шум
function makeBrownBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = ctx.sampleRate * seconds
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  return buf
}

// ── Построители сцен ────────────────────────────────────────
function buildRain(ctx: AudioContext, master: GainNode): (AudioBufferSourceNode | OscillatorNode)[] {
  const src = ctx.createBufferSource()
  src.buffer = makePinkBuffer(ctx, 4)
  src.loop = true

  const hiFilter = ctx.createBiquadFilter()
  hiFilter.type = "bandpass"
  hiFilter.frequency.value = 4000
  hiFilter.Q.value = 0.4

  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.type = "sine"
  lfo.frequency.value = 0.25
  lfoGain.gain.value = 0.18  // диапазон модуляции громкости
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()

  src.connect(hiFilter)
  hiFilter.connect(master)
  src.start()
  return [src, lfo]
}

function buildOcean(ctx: AudioContext, master: GainNode): (AudioBufferSourceNode | OscillatorNode)[] {
  const src = ctx.createBufferSource()
  src.buffer = makeWhiteBuffer(ctx, 4)
  src.loop = true

  const loFilter = ctx.createBiquadFilter()
  loFilter.type = "lowpass"
  loFilter.frequency.value = 700

  // Медленный LFO модулирует cutoff фильтра — имитирует набег волны
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.type = "sine"
  lfo.frequency.value = 0.1
  lfoGain.gain.value = 500
  lfo.connect(lfoGain)
  lfoGain.connect(loFilter.frequency)
  lfo.start()

  // Второй LFO для амплитуды
  const lfo2 = ctx.createOscillator()
  const lfoGain2 = ctx.createGain()
  lfo2.type = "sine"
  lfo2.frequency.value = 0.08
  lfoGain2.gain.value = 0.2
  lfo2.connect(lfoGain2)
  lfoGain2.connect(master.gain)
  lfo2.start()

  src.connect(loFilter)
  loFilter.connect(master)
  src.start()
  return [src, lfo, lfo2]
}

function buildWhite(ctx: AudioContext, master: GainNode): (AudioBufferSourceNode | OscillatorNode)[] {
  const src = ctx.createBufferSource()
  src.buffer = makeWhiteBuffer(ctx, 2)
  src.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = 2500

  src.connect(filter)
  filter.connect(master)
  src.start()
  return [src]
}

function buildForest(ctx: AudioContext, master: GainNode): (AudioBufferSourceNode | OscillatorNode)[] {
  // Ветер: отфильтрованный белый шум
  const src = ctx.createBufferSource()
  src.buffer = makeWhiteBuffer(ctx, 2)
  src.loop = true

  const hiPass = ctx.createBiquadFilter()
  hiPass.type = "highpass"
  hiPass.frequency.value = 300

  const loPass = ctx.createBiquadFilter()
  loPass.type = "lowpass"
  loPass.frequency.value = 1800

  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.type = "sine"
  lfo.frequency.value = 0.18
  lfoGain.gain.value = 0.12
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()

  src.connect(hiPass)
  hiPass.connect(loPass)
  loPass.connect(master)
  src.start()
  return [src, lfo]
}

function buildCafe(ctx: AudioContext, master: GainNode): (AudioBufferSourceNode | OscillatorNode)[] {
  // Стерео коричневый шум — гул толпы
  const src = ctx.createBufferSource()
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + (ch === 0 ? 0.022 : 0.019) * white) / 1.02
      d[i] = last * 4
    }
  }
  src.buffer = buf
  src.loop = true

  const bandPass = ctx.createBiquadFilter()
  bandPass.type = "bandpass"
  bandPass.frequency.value = 900
  bandPass.Q.value = 0.25

  const presence = ctx.createBiquadFilter()
  presence.type = "peaking"
  presence.frequency.value = 2500
  presence.gain.value = 4

  // Едва заметная случайная амплитуда — «фраза и тишина»
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.type = "sine"
  lfo.frequency.value = 0.07
  lfoGain.gain.value = 0.08
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()

  src.connect(bandPass)
  bandPass.connect(presence)
  presence.connect(master)
  src.start()
  return [src, lfo]
}

// ── Хук ─────────────────────────────────────────────────────
export function useAudioSynthesizer() {
  const stateRef = useRef<AudioState | null>(null)

  // Полная остановка с плавным затуханием (fade-out 300 мс)
  const stop = useCallback(() => {
    const s = stateRef.current
    if (!s) return

    const { ctx, masterGain, sources } = s
    const fadeTime = 0.3

    try {
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, fadeTime / 3)
    } catch {}

    const cleanup = () => {
      sources.forEach(node => {
        try { node.stop() } catch {}
        try { node.disconnect() } catch {}
      })
      try { masterGain.disconnect() } catch {}
      try { ctx.close() } catch {}
    }

    setTimeout(cleanup, fadeTime * 1000 + 100)
    stateRef.current = null
  }, [])

  // Запуск нового звука — принимается только после жеста пользователя
  const play = useCallback((sound: Sound, volume: number) => {
    stop()
    if (sound === "none") return

    // AudioContext создаётся здесь — уже внутри обработчика события,
    // поэтому браузерная политика autoplay не блокирует его.
    let ctx: AudioContext
    try {
      ctx = new AudioContext()
    } catch {
      console.warn("AudioContext not supported")
      return
    }

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0  // начинаем с нуля — fade-in
    masterGain.connect(ctx.destination)

    let sources: (AudioBufferSourceNode | OscillatorNode)[]

    switch (sound) {
      case "rain":   sources = buildRain(ctx, masterGain);   break
      case "ocean":  sources = buildOcean(ctx, masterGain);  break
      case "white":  sources = buildWhite(ctx, masterGain);  break
      case "forest": sources = buildForest(ctx, masterGain); break
      case "cafe":   sources = buildCafe(ctx, masterGain);   break
      default:       sources = []
    }

    // Fade-in 500 мс
    masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.15)

    stateRef.current = { ctx, masterGain, sources, lfoSources: [] }
  }, [stop])

  const setVolume = useCallback((v: number) => {
    if (stateRef.current) {
      stateRef.current.masterGain.gain.setTargetAtTime(
        v,
        stateRef.current.ctx.currentTime,
        0.05,
      )
    }
  }, [])

  // Уничтожаем при размонтировании компонента
  useEffect(() => () => { stop() }, [stop])

  return { play, stop, setVolume }
}
