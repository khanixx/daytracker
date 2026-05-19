"use client"
// src/components/ThemeToggle.tsx
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Избегаем гидратационных несоответствий — рендерим только на клиенте
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn w-9 h-9 rounded-full p-0 border"
      style={{ borderColor: "var(--border)" }}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      aria-label="Переключить тему"
    >
      {isDark
        ? <i className="ti ti-sun text-base" style={{ color: "var(--amber)" }} />
        : <i className="ti ti-moon text-base" style={{ color: "var(--accent)" }} />}
    </button>
  )
}
