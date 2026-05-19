// src/app/api/habits/logs/route.ts
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

  const logs = await prisma.habitLog.findMany({ where })
  return NextResponse.json(logs)
}
