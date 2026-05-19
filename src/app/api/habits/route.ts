// src/app/api/habits/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, icon } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const count = await prisma.habit.count({ where: { userId: session.user.id } })
  const habit = await prisma.habit.create({
    data: { name, icon: icon || "🌿", userId: session.user.id, order: count },
  })
  return NextResponse.json(habit, { status: 201 })
}
