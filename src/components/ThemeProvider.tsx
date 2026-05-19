"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Вместо импорта из next-themes используем стандартный тип для children
export function ThemeProvider({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
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
