"use client"
// src/components/ThemeProvider.tsx
// Зависимость: npm install next-themes
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"       // добавляет класс "dark" на <html>
      defaultTheme="system"   // уважает системные настройки
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
