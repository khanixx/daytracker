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

  // ── Боковая панель (список) — переиспользуется на десктопе ──
  const SidebarContent = (
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

      {allTags.length > 0 && (
        <div className="px-3 py-2 flex gap-1 flex-wrap border-b" style={{ borderColor: "var(--border)" }}>
          {allTags.map(t => (
            <button key={t} onClick={() => setFilterTag(t === filterTag ? null : t)}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
              style={{
                background: filterTag === t ? tagColor(t) : `${tagColor(t)}22`,
                color: filterTag === t ? "#fff" : tagColor(t),
              }}>
              #{t}
            </button>
          ))}
        </div>
      )}

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
            className="w-full flex flex-col px-3 py-2.5 border-b text-left transition-colors"
            style={{
              borderColor: "var(--border)",
              background: selected?.id === n.id ? "var(--surface2)" : "transparent",
            }}>
            <div className="flex items-center justify-between gap-2 w-full">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                {n.title || "Без названия"}
              </p>
              <span className="text-[10px] shrink-0" style={{ color: "var(--muted)" }}>
                {fmtDate(n.updatedAt)}
              </span>
            </div>
            <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted)" }}>
              {n.content || "Пусто"}
            </p>
            {n.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {n.tags.map(t => (
                  <span key={t} className="px-1.5 py-0 rounded-full text-[9px] font-semibold"
                    style={{ background: `${tagColor(t)}22`, color: tagColor(t) }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Редактор — переиспользуется на десктопе и мобиле ──
  const EditorContent = selected ? (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        {/* Кнопка назад — только на мобиле */}
        <button
          className="sm:hidden btn w-8 h-8 rounded-full p-0 shrink-0"
          onClick={() => setShowEditor(false)}>
          <i className="ti ti-arrow-left text-base" />
        </button>
        <p className="flex-1 text-xs font-semibold truncate" style={{ color: "var(--muted)" }}>
          {fmtDate(selected.updatedAt)}
        </p>
        {saving && (
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            <i className="ti ti-loader animate-spin" /> Сохранение...
          </span>
        )}
        <button
          onClick={() => { deleteNote(selected.id); setShowEditor(false) }}
          className="btn btn-danger text-xs px-2 py-1">
          <i className="ti ti-trash text-sm" />
        </button>
      </div>

      <input
        className="px-4 pt-4 pb-1 text-xl font-bold outline-none bg-transparent w-full shrink-0"
        style={{ color: "var(--text)", border: "none" }}
        placeholder="Заголовок..."
        value={selected.title}
        onChange={e => updateField("title", e.target.value)}
      />

      <p className="px-4 text-xs pb-2 shrink-0" style={{ color: "var(--muted)" }}>
        {fmtDate(selected.updatedAt)}
      </p>

      <textarea
        ref={editorRef}
        className="flex-1 px-4 pb-4 outline-none resize-none bg-transparent text-sm leading-relaxed"
        style={{ color: "var(--text)", border: "none", fontFamily: "inherit" }}
        placeholder="Начните писать..."
        value={selected.content}
        onChange={e => updateField("content", e.target.value)}
      />

      {/* Теги */}
      <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-1.5 flex-wrap items-center">
          {selected.tags.map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: `${tagColor(t)}22`, color: tagColor(t) }}>
              #{t}
              <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
          {showTagInput ? (
            <input
              className="input text-xs px-2 py-1 w-28"
              placeholder="тег..."
              value={newTagInput}
              autoFocus
              onChange={e => setNewTagInput(e.target.value.toLowerCase().replace(/\s/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setShowTagInput(false) }}
              onBlur={() => { addTag(); setShowTagInput(false) }}
            />
          ) : (
            <button onClick={() => setShowTagInput(true)}
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all"
              style={{ background: "var(--surface2)", color: "var(--muted)" }}>
              + тег
            </button>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "var(--muted)" }}>
      <i className="ti ti-notebook text-5xl opacity-30" />
      <p className="text-sm font-medium">Выберите или создайте заметку</p>
      <button onClick={createNote} className="btn btn-primary text-xs">
        <i className="ti ti-plus" /> Создать
      </button>
    </div>
  )

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        height: "calc(100dvh - 130px)",
        display: "flex",
        flexDirection: "column",
      }}>

      {/* ── Десктоп: две колонки ── */}
      <div className="hidden sm:flex h-full">
        <aside className="w-64 shrink-0 border-r h-full overflow-hidden"
          style={{ borderColor: "var(--border)" }}>
          {SidebarContent}
        </aside>
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          {EditorContent}
        </div>
      </div>

      {/* ── Мобиле: одна панель ── */}
      <div className="flex sm:hidden flex-col h-full overflow-hidden">
        {!showEditor ? SidebarContent : EditorContent}
      </div>

    </div>
  )
}
