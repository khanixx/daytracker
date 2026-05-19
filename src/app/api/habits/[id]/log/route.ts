// src/app/api/habits/[id]/log/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { date, done } = await req.json()

  if (done) {
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: params.id, date } },
      update: { done: true },
      create: { habitId: params.id, userId: session.user.id, date, done: true },
    })
  } else {
    await prisma.habitLog.deleteMany({
      where: { habitId: params.id, date, userId: session.user.id },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "7")

  const logs = await prisma.habitLog.findMany({
    where: {
      habitId: params.id,
      userId: session.user.id,
    },
    orderBy: { date: "desc" },
    take: days,
  })

  return NextResponse.json(logs)
}
