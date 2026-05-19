// src/app/login/page.tsx
"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email, password, redirect: false,
    })

    if (res?.error) {
      setError("Неверный email или пароль")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "var(--accent)", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
            <i className="ti ti-sun text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Добро пожаловать</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Войдите в свой аккаунт</p>
        </div>

        <div className="card" style={{ padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>Пароль</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-center py-2 px-3 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? (
                <><i className="ti ti-loader-2 animate-spin" /> Вход...</>
              ) : "Войти"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold" style={{ color: "var(--accent)" }}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
