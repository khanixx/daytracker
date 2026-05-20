// src/hooks/useSSEChat.ts
// Хук подключается к SSE-стриму и возвращает живые сообщения
"use client"
import { useState, useEffect, useRef, useCallback } from "react"

export interface ChatMessage {
  id: string
  text: string
  createdAt: string
  readAt: string | null
  senderId: string
  sender: { name: string | null; handle: string | null; avatarColor: string }
}

export function useSSEChat(convId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const esRef     = useRef<EventSource | null>(null)
  const lastIdRef = useRef<string>("")

  // Первичная загрузка истории (REST)
  const loadHistory = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`)
    const data: ChatMessage[] = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      setMessages(data)
      lastIdRef.current = data[data.length - 1].id
    }
  }, [])

  // Подключаем SSE
  useEffect(() => {
    if (!convId) { setMessages([]); setConnected(false); return }

    setMessages([])
    lastIdRef.current = ""
    setConnected(false)

    loadHistory(convId).then(() => {
      // После загрузки истории подключаемся к стриму для новых сообщений
      const url = `/api/conversations/${convId}/stream?lastId=${encodeURIComponent(lastIdRef.current)}`
      const es  = new EventSource(url)
      esRef.current = es

      es.onopen = () => setConnected(true)

      es.onmessage = (e) => {
        try {
          const msg: ChatMessage = JSON.parse(e.data)
          lastIdRef.current = msg.id
          setMessages(prev => {
            // Не добавляем дубли
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        } catch {}
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        // Реконнект через 2 сек
        setTimeout(() => {
          if (esRef.current === es) {
            esRef.current = null
            // Триггерим ре-эффект через смену ключа — в ChatTab
          }
        }, 2000)
      }
    })

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [convId, loadHistory])

  // Добавить оптимистично отправленное сообщение
  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
    lastIdRef.current = msg.id
  }, [])

  return { messages, connected, addOptimistic }
}
