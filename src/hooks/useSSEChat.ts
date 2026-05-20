// src/hooks/useSSEChat.ts
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
  const esRef       = useRef<EventSource | null>(null)
  const lastIdRef   = useRef<string>("")
  const reconnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef  = useRef(true)

  const loadHistory = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`)
    const data: ChatMessage[] = await res.json()
    if (Array.isArray(data) && data.length > 0 && mountedRef.current) {
      setMessages(data)
      lastIdRef.current = data[data.length - 1].id
    }
  }, [])

  const connect = useCallback((id: string) => {
    if (!mountedRef.current) return
    esRef.current?.close()
    esRef.current = null

    const url = `/api/conversations/${id}/stream?lastId=${encodeURIComponent(lastIdRef.current)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      if (mountedRef.current) setConnected(true)
    }

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const msg: ChatMessage = JSON.parse(e.data)
        lastIdRef.current = msg.id
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } catch {}
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      setConnected(false)
      es.close()
      esRef.current = null
      // Реконнект через 2 сек
      reconnTimer.current = setTimeout(() => {
        if (mountedRef.current) connect(id)
      }, 2000)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!convId) {
      setMessages([])
      setConnected(false)
      return
    }

    setMessages([])
    lastIdRef.current = ""
    setConnected(false)

    loadHistory(convId).then(() => {
      if (mountedRef.current) connect(convId)
    })

    return () => {
      mountedRef.current = false
      esRef.current?.close()
      esRef.current = null
      if (reconnTimer.current) clearTimeout(reconnTimer.current)
    }
  }, [convId, loadHistory, connect])

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, msg]
    })
    lastIdRef.current = msg.id
  }, [])

  return { messages, connected, addOptimistic }
}
