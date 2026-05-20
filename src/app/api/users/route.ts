// src/app/api/users/route.ts
// GET /api/users?handle=john_doe  — найти пользователя по @тегу
// GET /api/users?q=john           — поиск по части тега/имени
// PATCH /api/users                — обновить свой профиль (handle, bio, avatarColor, isPublic)
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const PUBLIC_FIELDS = {
  id: true, name: true, handle: true, bio: true,
  avatarColor: true, isPublic: true, createdAt: true,
  // публичная статистика
  habitLogs: { select: { date: true, done: true }, orderBy: { date: "desc" as const }, take: 90 },
  pomodoroLogs: { select: { date: true, count: true }, orderBy: { date: "desc" as const }, take: 30 },
  habits: { select: { id: true, name: true, icon: true }, take: 20 },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get("handle")
  const q = searchParams.get("q")

  if (handle) {
    const user = await prisma.user.findUnique({
      where: { handle },
      select: PUBLIC_FIELDS,
    })
    if (!user) return NextResponse.json({ error: "Не найден" }, { status: 404 })
    return NextResponse.json(user)
  }

  if (q) {
    const users = await prisma.user.findMany({
      where: {
        isPublic: true,
        OR: [
          { handle: { contains: q, mode: "insensitive" } },
          { name:   { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, handle: true, bio: true, avatarColor: true },
      take: 20,
    })
    return NextResponse.json(users)
  }

  return NextResponse.json({ error: "Укажи handle или q" }, { status: 400 })
}

// PATCH — обновить свой профиль
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { handle, bio, avatarColor, isPublic, name } = body

  // Валидация handle
  if (handle !== undefined) {
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      return NextResponse.json(
        { error: "Тег: 3-24 символа, только a-z, 0-9, _" },
        { status: 422 },
      )
    }
    const taken = await prisma.user.findFirst({
      where: { handle, NOT: { id: session.user.id } },
    })
    if (taken) return NextResponse.json({ error: "Тег занят" }, { status: 409 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name        !== undefined ? { name }        : {}),
      ...(handle      !== undefined ? { handle }      : {}),
      ...(bio         !== undefined ? { bio }         : {}),
      ...(avatarColor !== undefined ? { avatarColor } : {}),
      ...(isPublic    !== undefined ? { isPublic }    : {}),
    },
    select: { id: true, name: true, handle: true, bio: true, avatarColor: true, isPublic: true },
  })

  return NextResponse.json(user)
}
