// src/app/api/tasks/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: Record<string, unknown> = { userId: session.user.id }
  if (startDate && endDate) where.date = { gte: startDate, lte: endDate }
  else where.date = date || new Date().toISOString().slice(0, 10)

  const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: "asc" } })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, category, priority, date } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      name,
      category: category || "personal",
      priority: priority || "med",
      date: date || new Date().toISOString().slice(0, 10),
      userId: session.user.id,
    },
  })
  return NextResponse.json(task, { status: 201 })
}
