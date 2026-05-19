// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notes — получить все заметки текущего пользователя
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tag = searchParams.get("tag")
  const q = searchParams.get("q")

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(notes)
}

// POST /api/notes — создать заметку
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title = "Без названия", content = "", tags = [] } = body

  const note = await prisma.note.create({
    data: { userId: session.user.id, title, content, tags },
  })

  return NextResponse.json(note, { status: 201 })
}
