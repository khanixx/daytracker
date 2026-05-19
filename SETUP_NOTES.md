# Что изменилось (патч)

## Единственный ручной шаг после распаковки

После `npm install` выполните миграцию БД:

```bash
npx prisma migrate dev --name add_notes
npx prisma generate
```

Это создаст таблицу `Note` в вашей Neon PostgreSQL.

## Изменённые/новые файлы

| Файл | Статус |
|---|---|
| `prisma/schema.prisma` | ✏️ Добавлена модель `Note` |
| `package.json` | ✏️ Добавлена зависимость `next-themes` |
| `src/app/globals.css` | ✏️ Премиум тёмная/светлая тема |
| `src/app/layout.tsx` | ✏️ Anti-flash скрипт + ThemeProvider |
| `src/app/api/notes/route.ts` | 🆕 GET / POST заметок |
| `src/app/api/notes/[id]/route.ts` | 🆕 PUT / DELETE заметки |
| `src/components/AppClient.tsx` | ✏️ Добавлена вкладка «Заметки» + ThemeToggle |
| `src/components/PomodoroTab.tsx` | ✏️ Использует новый хук аудио |
| `src/components/NotesTab.tsx` | 🆕 UI заметок с автосохранением |
| `src/components/ThemeProvider.tsx` | 🆕 Обёртка next-themes |
| `src/components/ThemeToggle.tsx` | 🆕 Кнопка переключения темы |
| `src/hooks/useAudioSynthesizer.ts` | 🆕 Исправленный Web Audio хук |
