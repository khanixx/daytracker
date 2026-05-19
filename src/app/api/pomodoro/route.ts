// src/app/api/pomodoro/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (startDate && endDate) {
    const logs = await prisma.pomodoroLog.findMany({
      where: { userId: session.user.id, date: { gte: startDate, lte: endDate } },
    })
    return NextResponse.json(logs)
  }

  const d = date || new Date().toISOString().slice(0, 10)
  const log = await prisma.pomodoroLog.findUnique({
    where: { userId_date: { userId: session.user.id, date: d } },
  })
  return NextResponse.json({ count: log?.count || 0 })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { date } = await req.json()
  const today = date || new Date().toISOString().slice(0, 10)

  const log = await prisma.pomodoroLog.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    update: { count: { increment: 1 } },
    create: { userId: session.user.id, date: today, count: 1 },
  })
  return NextResponse.json({ count: log.count })
}
