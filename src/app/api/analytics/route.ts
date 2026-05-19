// src/app/api/analytics/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "7")

  // Generate date range
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  const [habitLogs, taskData, pomodoroLogs, habits] = await Promise.all([
    prisma.habitLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.task.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.pomodoroLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.habit.findMany({ where: { userId: session.user.id } }),
  ])

  // Build day-by-day data
  const dayData = dates.map(date => {
    const habitsDone = habitLogs.filter(l => l.date === date).length
    const tasksTotal = taskData.filter(t => t.date === date).length
    const tasksDone = taskData.filter(t => t.date === date && t.done).length
    const pomos = pomodoroLogs.find(p => p.date === date)?.count || 0
    const total = habits.length + tasksTotal
    const score = total ? Math.round((habitsDone + tasksDone) / total * 100) : 0
    return { date, habitsDone, tasksTotal, tasksDone, pomos, score }
  })

  const totalPomos = pomodoroLogs.reduce((a, p) => a + p.count, 0)
  const avgHabits = habitLogs.length / days
  const avgTasks = taskData.filter(t => t.done).length / days

  // Category breakdown
  const catWork = taskData.filter(t => t.done && t.category === "work").length
  const catHealth = taskData.filter(t => t.done && t.category === "health").length
  const catPersonal = taskData.filter(t => t.done && t.category === "personal").length

  // Best streak
  let bestStreak = 0, curStreak = 0
  for (const d of dayData) {
    if (d.score > 0) { curStreak++; bestStreak = Math.max(bestStreak, curStreak) }
    else curStreak = 0
  }

  // Habit completion rates
  const habitRates = habits.map(h => {
    const done = habitLogs.filter(l => l.habitId === h.id).length
    return { id: h.id, name: h.name, icon: h.icon, pct: Math.round(done / days * 100) }
  })

  return NextResponse.json({
    days: dayData,
    totalPomos,
    avgHabits: Math.round(avgHabits * 10) / 10,
    avgTasks: Math.round(avgTasks * 10) / 10,
    bestStreak,
    categories: { work: catWork, health: catHealth, personal: catPersonal },
    habitRates,
  })
}
