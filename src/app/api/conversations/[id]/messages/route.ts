// src/app/api/conversations/[id]/messages/route.ts
// GET  — получить сообщения (с пагинацией cursor-based)
// POST — отправить сообщение
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function checkAccess(convId: string, userId: string) {
  const conv = await prisma.conversation.findUnique({ where: { id: convId } })
  if (!conv) return null
  if (conv.userAId !== userId && conv.userBId !== userId) return null
  return conv
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const conv = await checkAccess(params.id, session.user.id)
  if (!conv) return NextResponse.json({ error: "Нет доступа" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")   // id последнего известного сообщения
  const limit  = 40

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, text: true, createdAt: true, readAt: true,
      senderId: true,
      sender: { select: { name: true, handle: true, avatarColor: true } },
    },
  })

  // Помечаем входящие как прочитанные
  const unreadIds = messages
    .filter(m => m.senderId !== session.user.id && !m.readAt)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    })
  }

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const conv = await checkAccess(params.id, session.user.id)
  if (!conv) return NextResponse.json({ error: "Нет доступа" }, { status: 403 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 })

  const msg = await prisma.message.create({
    data: {
      conversationId: params.id,
      senderId: session.user.id,
      text: text.trim(),
    },
    select: {
      id: true, text: true, createdAt: true, readAt: true,
      senderId: true,
      sender: { select: { name: true, handle: true, avatarColor: true } },
    },
  })

  return NextResponse.json(msg, { status: 201 })
}
