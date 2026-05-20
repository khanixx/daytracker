"use client"
// src/components/ChatTab.tsx — SSE real-time чат
import { useState, useEffect, useRef, useCallback } from "react"
import { useSSEChat } from "@/hooks/useSSEChat"

interface OtherUser {
  id: string
  name: string | null
  handle: string | null
  avatarColor: string
}

interface ConvSummary {
  id: string
  other: OtherUser
  lastMessage: { text: string; createdAt: string; senderId: string; readAt: string | null } | null
  unread: number
}

function Avatar({ name, color, size = 36 }: { name: string | null; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {(name || "?")?.[0]?.toUpperCase()}
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

// ── Внутренний компонент окна переписки ──────────────────────
function ChatWindow({
  convId, myId, other, onNewMessage,
}: {
  convId: string; myId: string; other: OtherUser
  onNewMessage: () => void
}) {
  const { messages, connected, addOptimistic } = useSSEChat(convId)
  const [input, setInput]   = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput("")
    setSending(true)

    const res = await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    const msg = await res.json()
    setSending(false)
    if (msg.id) {
      addOptimistic(msg)
      onNewMessage()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Заголовок */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}>
        <Avatar name={other.name} color={other.avatarColor} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
            {other.name || "Без имени"}
          </p>
          {other.handle && (
            <p className="text-[11px]" style={{ color: "var(--accent)" }}>@{other.handle}</p>
          )}
        </div>
        {/* Индикатор соединения */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full transition-colors"
            style={{ background: connected ? "var(--green)" : "var(--amber)" }} />
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {connected ? "онлайн" : "соединение..."}
          </span>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16"
            style={{ color: "var(--muted)" }}>
            <i className="ti ti-message-circle text-4xl opacity-20" />
            <p className="text-xs">Начни разговор!</p>
          </div>
        )}

        {(() => {
          // Группируем сообщения по дате
          let lastDate = ""
          return messages.map(msg => {
            const isMe = msg.senderId === myId
            const msgDate = new Date(msg.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long",
            })
            const showDate = msgDate !== lastDate
            lastDate = msgDate

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] px-3 py-1 rounded-full"
                      style={{ background: "var(--surface2)", color: "var(--muted)" }}>
                      {msgDate}
                    </span>
                  </div>
                )}
                <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMe && (
                    <Avatar name={msg.sender.name} color={msg.sender.avatarColor} size={26} />
                  )}
                  <div className="max-w-[75%]">
                    <div className="px-3.5 py-2 text-sm leading-relaxed"
                      style={{
                        background: isMe ? "var(--accent)" : "var(--surface2)",
                        color: isMe ? "#fff" : "var(--text)",
                        borderRadius: 18,
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: !isMe ? 4 : 18,
                        wordBreak: "break-word",
                      }}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : ""}`}>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {fmtTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <i className={`ti ${msg.readAt ? "ti-checks" : "ti-check"} text-[10px]`}
                          style={{ color: msg.readAt ? "var(--green)" : "var(--muted)" }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        })()}
        <div ref={bottomRef} />
      </div>

      {/* Ввод */}
      <div className="px-4 py-3 border-t flex items-end gap-2 shrink-0"
        style={{ borderColor: "var(--border)" }}>
        <textarea
          className="input flex-1 text-sm resize-none"
          placeholder="Сообщение..."
          rows={1}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            // Авто-высота
            e.target.style.height = "auto"
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
          }}
          style={{ minHeight: 40, maxHeight: 120 }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="btn btn-primary w-10 h-10 rounded-full p-0 shrink-0 transition-all"
          style={{ opacity: !input.trim() ? 0.45 : 1 }}>
          <i className="ti ti-send text-base" />
        </button>
      </div>
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────
export function ChatTab({ myId, initialConvId, initialOther }: {
  myId: string
  initialConvId?: string | null
  initialOther?: OtherUser | null
}) {
  const [convs, setConvs]               = useState<ConvSummary[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId ?? null)
  const [activeOther, setActiveOther]   = useState<OtherUser | null>(initialOther ?? null)
  const [loading, setLoading]           = useState(true)

  const loadConvs = useCallback(async () => {
    const res = await fetch("/api/conversations")
    const data = await res.json()
    if (Array.isArray(data)) setConvs(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])

  // Слушаем событие из SocialTab («Написать»)
  useEffect(() => {
    const handler = (e: Event) => {
      const { convId, other } = (e as CustomEvent).detail
      setActiveConvId(convId)
      setActiveOther(other)
      loadConvs()
    }
    window.addEventListener("open-chat", handler)
    return () => window.removeEventListener("open-chat", handler)
  }, [loadConvs])

  return (
    <div className="flex gap-0 rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        height: "calc(100vh - 160px)",
        minHeight: 480,
      }}>

      {/* ── Список диалогов ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r"
        style={{ borderColor: "var(--border)" }}>
        <div className="px-3 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            <i className="ti ti-messages mr-1.5" style={{ color: "var(--accent)" }} />
            Сообщения
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-3 flex flex-col gap-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          )}
          {!loading && convs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4"
              style={{ color: "var(--muted)" }}>
              <i className="ti ti-message-off text-3xl opacity-30" />
              <p className="text-xs text-center leading-relaxed">
                Найди кого-нибудь во вкладке «Люди» и напиши первым
              </p>
            </div>
          )}

          {convs.map(c => {
            const isActive = activeConvId === c.id
            return (
              <button key={c.id}
                onClick={() => { setActiveConvId(c.id); setActiveOther(c.other) }}
                className="w-full flex items-center gap-2.5 px-3 py-3 border-b text-left transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: isActive ? "var(--surface2)" : "transparent",
                }}>
                <div className="relative">
                  <Avatar name={c.other.name} color={c.other.avatarColor} size={40} />
                  {c.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: "var(--accent)" }}>
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.other.name || c.other.handle || "???"}
                    </p>
                    {c.lastMessage && (
                      <span className="text-[10px] shrink-0" style={{ color: "var(--muted)" }}>
                        {fmtTime(c.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-[11px] truncate mt-0.5"
                      style={{
                        color: c.unread > 0 ? "var(--text)" : "var(--muted)",
                        fontWeight: c.unread > 0 ? 600 : 400,
                      }}>
                      {c.lastMessage.senderId === myId ? "Вы: " : ""}
                      {c.lastMessage.text}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Окно чата / заглушка ── */}
      {activeConvId && activeOther ? (
        <ChatWindow
          key={activeConvId}
          convId={activeConvId}
          myId={myId}
          other={activeOther}
          onNewMessage={loadConvs}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3"
          style={{ color: "var(--muted)" }}>
          <i className="ti ti-message-circle text-5xl opacity-20" />
          <p className="text-sm font-medium">Выбери диалог</p>
          <p className="text-xs text-center px-8 leading-relaxed">
            Или найди кого-нибудь во вкладке «Люди» и напиши первым
          </p>
        </div>
      )}
    </div>
  )
}
