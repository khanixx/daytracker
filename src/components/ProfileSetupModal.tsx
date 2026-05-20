"use client"
// src/components/ProfileSetupModal.tsx
// Модалка для установки @тега и профиля (появляется если handle не задан)
import { useState } from "react"

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444",
  "#f59e0b","#10b981","#06b6d4","#3b82f6",
]

interface Props {
  currentName: string
  onSaved: (data: { handle: string; name: string; bio: string; avatarColor: string }) => void
}

export function ProfileSetupModal({ currentName, onSaved }: Props) {
  const [handle, setHandle] = useState("")
  const [name, setName]     = useState(currentName || "")
  const [bio, setBio]       = useState("")
  const [color, setColor]   = useState(AVATAR_COLORS[0])
  const [error, setError]   = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setError("")
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      setError("Тег: 3–24 символа, только строчные латинские буквы, цифры, _")
      return
    }
    setSaving(true)
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, name, bio, avatarColor: color }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || "Ошибка"); return }
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>

        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
          Настроить профиль
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
          Установи уникальный @тег, чтобы другие могли тебя найти
        </p>

        {/* Avatar color */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {AVATAR_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{
                background: c,
                outline: color === c ? `3px solid ${c}` : "none",
                outlineOffset: "2px",
                transform: color === c ? "scale(1.15)" : "scale(1)",
              }} />
          ))}
        </div>

        {/* Preview avatar */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: "var(--bg)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: color }}>
            {(name || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{name || "Имя"}</p>
            <p className="text-xs" style={{ color: "var(--accent)" }}>@{handle || "тег"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted)" }}>Имя</label>
            <input className="input" placeholder="Твоё имя" value={name}
              onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted)" }}>
              @тег <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: "var(--accent)" }}>@</span>
              <input className="input pl-7" placeholder="твой_тег"
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                maxLength={24} />
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
              3–24 символа · только a-z, 0-9, _
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--muted)" }}>О себе</label>
            <textarea className="input resize-none" rows={2} placeholder="Пара слов о себе..."
              value={bio} onChange={e => setBio(e.target.value)} maxLength={160} />
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: "var(--red-subtle)", color: "var(--red)" }}>
            {error}
          </p>
        )}

        <button onClick={submit} disabled={saving}
          className="btn btn-primary w-full mt-4"
          style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </div>
    </div>
  )
}
