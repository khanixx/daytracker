// src/app/api/conversations/[id]/stream/route.ts
// SSE endpoint — клиент подписывается и получает новые сообщения в реальном времени
// Т.к. Neon/Vercel не держит постоянное соединение >30 с, используем короткий polling
// внутри SSE-стрима: клиент держит один EventSource, сервер опрашивает БД каждые 1.5 с
// и пушит только НОВЫЕ сообщения. Это даёт real-time ощущение без WebSocket-сервера.
import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 25 // Vercel hobby limit

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  const me = session.user.id

  // Проверяем доступ к диалогу
  const conv = await prisma.conversation.findUnique({ where: { id: params.id } })
  if (!conv || (conv.userAId !== me && conv.userBId !== me)) {
    return new Response("Forbidden", { status: 403 })
  }

  const encoder = new TextEncoder()
  let lastId = req.nextUrl.searchParams.get("lastId") || ""
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Отправляем heartbeat сразу чтобы браузер не закрыл соединение
      controller.enqueue(encoder.encode(": heartbeat\n\n"))

      const tick = async () => {
        if (closed) return
        try {
          const where = {
            conversationId: params.id,
            ...(lastId ? { id: { gt: lastId } } : {}),
          }
          // Получаем сообщения новее lastId (сортировка по cuid — лексикографическая)
          const msgs = await prisma.message.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: 20,
            select: {
              id: true, text: true, createdAt: true, readAt: true, senderId: true,
              sender: { select: { name: true, handle: true, avatarColor: true } },
            },
          })

          if (msgs.length > 0) {
            lastId = msgs[msgs.length - 1].id

            // Помечаем входящие как прочитанные
            const unread = msgs.filter(m => m.senderId !== me && !m.readAt).map(m => m.id)
            if (unread.length > 0) {
              await prisma.message.updateMany({
                where: { id: { in: unread } },
                data: { readAt: new Date() },
              })
            }

            for (const msg of msgs) {
              const data = `data: ${JSON.stringify(msg)}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          } else {
            // Heartbeat каждые 5 тиков чтобы соединение не рвалось
            controller.enqueue(encoder.encode(": ping\n\n"))
          }
        } catch (e) {
          closed = true
          controller.close()
          return
        }

        if (!closed) setTimeout(tick, 1500)
      }

      setTimeout(tick, 500)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
