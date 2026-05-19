// src/app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/notes/[id] — обновить заметку
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await prisma.note.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { title, content, tags } = body

  const note = await prisma.note.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  })

  return NextResponse.json(note)
}

// DELETE /api/notes/[id] — удалить заметку
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await prisma.note.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.note.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
