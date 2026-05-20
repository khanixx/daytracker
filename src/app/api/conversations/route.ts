// src/app/api/conversations/route.ts
// GET  — список своих диалогов с последним сообщением
// POST — открыть/найти диалог с другим пользователем { targetUserId }
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id

  const convs = await prisma.conversation.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    include: {
      userA: { select: { id: true, name: true, handle: true, avatarColor: true } },
      userB: { select: { id: true, name: true, handle: true, avatarColor: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, createdAt: true, senderId: true, readAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Нормализуем: «собеседник» всегда в поле `other`
  const result = convs.map(c => ({
    id: c.id,
    other: c.userAId === me ? c.userB : c.userA,
    lastMessage: c.messages[0] ?? null,
    unread: c.messages[0] && c.messages[0].senderId !== me && !c.messages[0].readAt ? 1 : 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const me = session.user.id

  const { targetUserId } = await req.json()
  if (!targetUserId || targetUserId === me)
    return NextResponse.json({ error: "Неверный пользователь" }, { status: 400 })

  // Проверяем что такой юзер есть
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, handle: true, avatarColor: true },
  })
  if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  // Пара [A, B] всегда в лексикографическом порядке → уникальность гарантирована
  const [userAId, userBId] = [me, targetUserId].sort()

  let conv = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } })
  if (!conv) {
    conv = await prisma.conversation.create({ data: { userAId, userBId } })
  }

  return NextResponse.json({ id: conv.id, other: target })
}
