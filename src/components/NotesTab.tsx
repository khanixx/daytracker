"use client"
// src/components/NotesTab.tsx
import { useState, useEffect, useRef, useCallback } from "react"

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const DEBOUNCE_MS = 1200 // автосохранение через 1.2 с после последнего изменения

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function tagColor(tag: string) {
  const palette = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]
  let hash = 0
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return palette[hash % palette.length]
}

export function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [q, setQ] = useState("")
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newTagInput, setNewTagInput] = useState("")
  const [showTagInput, setShowTagInput] = useState(false)
  const [showEditor, setShowEditor] = useState(false) // мобиле: показать редактор

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // ── Загрузка ─────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filterTag) params.set("tag", filterTag)
    const res = await fetch(`/api/notes?${params}`)
    const data: Note[] = await res.json()
    setNotes(data)
    setLoading(false)
  }, [q, filterTag])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // ── Создать заметку ─────────────────────────────────────
  async function createNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Без названия", content: "", tags: [] }),
    })
    const note: Note = await res.json()
    setNotes(prev => [note, ...prev])
    setSelected(note)
    setShowEditor(true)
    setTimeout(() => editorRef.current?.focus(), 50)
  }

  // ── Автосохранение ──────────────────────────────────────
  function scheduleAutoSave(updated: Note) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(updated), DEBOUNCE_MS)
  }

  async function save(note: Note) {
    setSaving(true)
    await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: note.title, content: note.content, tags: note.tags }),
    })
    setNotes(prev => prev.map(n => n.id === note.id ? { ...note, updatedAt: new Date().toISOString() } : n))
    setSaving(false)
  }

  function updateField(field: keyof Pick<Note, "title" | "content">, value: string) {
    if (!selected) return
    const updated = { ...selected, [field]: value }
    setSelected(updated)
    scheduleAutoSave(updated)
  }

  // ── Теги ────────────────────────────────────────────────
  function addTag() {
    if (!selected || !newTagInput.trim()) return
    const tag = newTagInput.trim().toLowerCase()
    if (selected.tags.includes(tag)) { setNewTagInput(""); return }
    const updated = { ...selected, tags: [...selected.tags, tag] }
    setSelected(updated)
    scheduleAutoSave(updated)
    setNewTagInput("")
    setShowTagInput(false)
  }

  function removeTag(tag: string) {
    if (!selected) return
    const updated = { ...selected, tags: selected.tags.filter(t => t !== tag) }
    setSelected(updated)
    scheduleAutoSave(updated)
  }

  // ── Удаление ────────────────────────────────────────────
  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" })
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  // Все уникальные теги для фильтра
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)))

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", height: "calc(100dvh - 130px)", display: "flex", flexDirection: "column" }}>

      {/* ── Десктоп: две колонки ── */}
      <div className="hidden sm:flex h-full">
      <aside className="w-64 shrink-0 flex flex-col border-r" style={{ borderColor: "var(--border)" }}>
        {/* Поиск + кнопка создания */}
        <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={createNote}
            className="btn btn-primary w-full mb-2 text-xs"
          >
            <i className="ti ti-plus text-sm" /> Новая заметка
          </button>
          <div className="relative">
            <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--muted)" }} />
            <input
              className="input text-xs pl-7"
              placeholder="Поиск..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Фильтр по тегам */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 flex gap-1 flex-wrap border-b" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setFilterTag(null)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
              style={{
                background: !filterTag ? "var(--accent)" : "transparent",
                color: !filterTag ? "#fff" : "var(--muted)",
                borderColor: !filterTag ? "var(--accent)" : "var(--border)",
              }}
            >
              Все
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                style={{
                  background: filterTag === tag ? tagColor(tag) : "transparent",
                  color: filterTag === tag ? "#fff" : "var(--muted)",
                  borderColor: filterTag === tag ? tagColor(tag) : "var(--border)",
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Список заметок */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-20 text-xs" style={{ color: "var(--muted)" }}>
              Загрузка...
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-xs" style={{ color: "var(--muted)" }}>
              <i className="ti ti-notebook text-2xl" />
              Заметок нет
            </div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelected(note)}
                className="w-full text-left px-3 py-2.5 border-b transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: selected?.id === note.id ? "var(--surface2)" : "transparent",
                }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                  {note.title || "Без названия"}
                </p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted)" }}>
                  {note.content ? note.content.slice(0, 60) : "Пусто"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                  {fmtDate(note.updatedAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── РЕДАКТОР десктоп ── */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0"
            style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {/* Теги */}
              {selected.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${tagColor(tag)}20`, color: tagColor(tag) }}
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:opacity-70">×</button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  autoFocus
                  className="text-xs border rounded-full px-2 py-0.5 outline-none w-24"
                  style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  placeholder="тег..."
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setShowTagInput(false) }}
                  onBlur={() => { if (!newTagInput) setShowTagInput(false) }}
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-[11px] px-2 py-0.5 rounded-full border transition-all hover:opacity-80"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  + тег
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {saving && (
                <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                  <i className="ti ti-loader animate-spin" /> Сохранение...
                </span>
              )}
              <button
                onClick={() => deleteNote(selected.id)}
                className="btn btn-danger text-xs px-2 py-1"
              >
                <i className="ti ti-trash text-sm" />
              </button>
            </div>
          </div>

          {/* Заголовок */}
          <input
            className="px-4 pt-4 pb-1 text-xl font-bold outline-none bg-transparent w-full"
            style={{ color: "var(--text)", border: "none" }}
            placeholder="Заголовок..."
            value={selected.title}
            onChange={e => updateField("title", e.target.value)}
          />

          <p className="px-4 text-xs pb-2" style={{ color: "var(--muted)" }}>
            {fmtDate(selected.updatedAt)}
          </p>

          {/* Контент */}
          <textarea
            ref={editorRef}
            className="flex-1 px-4 pb-4 outline-none resize-none bg-transparent text-sm leading-relaxed"
            style={{ color: "var(--text)", border: "none", fontFamily: "inherit" }}
            placeholder="Начните писать..."
            value={selected.content}
            onChange={e => updateField("content", e.target.value)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3"
          style={{ color: "var(--muted)" }}>
          <i className="ti ti-notebook text-5xl opacity-30" />
          <p className="text-sm font-medium">Выберите или создайте заметку</p>
          <button onClick={createNote} className="btn btn-primary text-xs">
            <i className="ti ti-plus" /> Создать
          </button>
        </div>
      )}
    </div>
      </div>{/* /desktop */}

      {/* ── Мобиле: один экран ── */}
      <div className="flex sm:hidden flex-col h-full">
        {!showEditor ? (
          // Список заметок на мобиле
          <div className="flex flex-col h-full">
            <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={createNote} className="btn btn-primary w-full mb-2 text-xs">
                <i className="ti ti-plus text-sm" /> Новая заметка
              </button>
              <div className="relative">
                <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--muted)" }} />
                <input
                  className="input text-xs pl-7"
                  placeholder="Поиск..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 flex flex-col gap-2">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--muted)" }}>
                  <i className="ti ti-notes-off text-3xl opacity-30" />
                  <p className="text-xs">Нет заметок</p>
                </div>
              ) : notes.map(n => (
                <button key={n.id}
                  onClick={() => { setSelected(n); setShowEditor(true) }}
                  className="w-full flex flex-col px-4 py-3 border-b text-left transition-colors"
                  style={{ borderColor: "var(--border)", background: selected?.id === n.id ? "var(--surface2)" : "transparent" }}>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {n.title || "Без названия"}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>
                    {n.content || "Пусто"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : selected ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setShowEditor(false)} className="btn w-8 h-8 rounded-full p-0 shrink-0">
                <i className="ti ti-arrow-left text-base" />
              </button>
              <p className="flex-1 text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                {selected.title || "Без названия"}
              </p>
              {saving && <i className="ti ti-loader animate-spin text-xs" style={{ color: "var(--muted)" }} />}
              <button onClick={() => { deleteNote(selected.id); setShowEditor(false) }} className="btn btn-danger text-xs px-2 py-1">
                <i className="ti ti-trash text-sm" />
              </button>
            </div>
            <input
              className="px-4 pt-3 pb-1 text-lg font-bold outline-none bg-transparent w-full shrink-0"
              style={{ color: "var(--text)", border: "none" }}
              placeholder="Заголовок..."
              value={selected.title}
              onChange={e => updateField("title", e.target.value)}
            />
            <textarea
              ref={editorRef}
              className="flex-1 px-4 pb-4 outline-none resize-none bg-transparent text-sm leading-relaxed"
              style={{ color: "var(--text)", border: "none", fontFamily: "inherit" }}
              placeholder="Начните писать..."
              value={selected.content}
              onChange={e => updateField("content", e.target.value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
