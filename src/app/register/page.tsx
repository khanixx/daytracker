// src/app/register/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
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
      router.push("/login?registered=1")
    }
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? <><i className="ti ti-loader-2 animate-spin" /> Создание...</> : "Зарегистрироваться"}
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
