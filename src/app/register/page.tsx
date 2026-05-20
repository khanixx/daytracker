// src/app/register/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444",
  "#f59e0b","#10b981","#06b6d4","#3b82f6",
]

export default function RegisterPage() {
  const [step, setStep] = useState<"account" | "profile">("account")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [handle, setHandle] = useState("")
  const [bio, setBio] = useState("")
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Пароль минимум 8 символов"); return }
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Ошибка регистрации")
      setLoading(false)
    } else {
      setLoading(false)
      setStep("profile")
    }
  }

  async function handleProfileSubmit() {
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      setError("Тег: 3–24 символа, только строчные латинские буквы, цифры, _")
      return
    }
    setLoading(true)
    setError("")

    // Сначала войдём чтобы получить сессию
    const signInRes = await signIn("credentials", {
      email, password, redirect: false,
    })

    if (signInRes?.error) {
      setError("Ошибка входа после регистрации")
      setLoading(false)
      return
    }

    // Обновим профиль
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, name, bio, avatarColor: color }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Ошибка сохранения профиля")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
              <i className="ti ti-user-circle text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Настройте профиль</h1>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Выберите @тег и аватар</p>
          </div>

          <div className="card" style={{ padding: "1.75rem" }}>
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

            {/* Preview */}
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

            <button onClick={handleProfileSubmit} disabled={loading}
              className="btn btn-primary w-full mt-4 py-3 text-base"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? <><i className="ti ti-loader-2 animate-spin" /> Сохранение...</> : "Войти в приложение →"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
            <i className="ti ti-sun text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Создать аккаунт</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Начните отслеживать свой день</p>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>Имя</label>
              <input
                className="input"
                type="text"
                placeholder="Ваше имя"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>Пароль</label>
              <input
                className="input"
                type="password"
                placeholder="Минимум 8 символов"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-center py-2 px-3 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? <><i className="ti ti-loader-2 animate-spin" /> Создание...</> : "Далее →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--accent)" }}>Войти</Link>
        </p>
      </div>
    </div>
  )
}
