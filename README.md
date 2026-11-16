# StreamLive Embed

Универсальный сервис генерации embed-плеера для **StreamLive**.

Вставь любую ссылку (YouTube, VK, Rutube, Twitch, Vimeo, OK, прямые mp4/m3u8 или страницу с OG-тегами) — сервис подтянет название, описание, картинку и соберёт готовый embed.

> **Данный сайт создан исключительно для скрипта StreamLive.**

## Стек

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Деплой на **Vercel** / Netlify / любой Node-хостинг

## Быстрый старт

```bash
cd streamlive-embed
npm install
npm run dev
```

Открой http://localhost:3000

## Деплой на Vercel

1. Запушь репозиторий на GitHub
2. Import в [vercel.com](https://vercel.com)
3. Deploy — всё уже настроено

Или:

```bash
npx vercel
```

## API

### POST /api/extract

```json
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
```

Ответ:

```json
{
  "url": "...",
  "title": "...",
  "description": "...",
  "image": "...",
  "embedUrl": "https://www.youtube.com/embed/...",
  "embedHtml": "<iframe ...>",
  "platform": "YouTube",
  "type": "video"
}
```

### GET /api/extract?url=...

То же самое.

## Страница плеера

`/e?u=<original_url>&t=<title>&d=<desc>&e=<embed_url>&img=<poster>&p=<platform>`

Можно передать только `u` — остальные поля извлекутся на сервере.

## Поддерживаемые платформы

| Платформа | Embed |
|-----------|-------|
| YouTube   | ✅ |
| VK Video  | ✅ |
| Rutube    | ✅ |
| Twitch    | ✅ |
| Vimeo     | ✅ |
| OK.ru     | ✅ |
| Direct MP4 / HLS | ✅ |
| Любая страница с OG / iframe | частичная поддержка |

## Лицензия

Только для использования со StreamLive.
