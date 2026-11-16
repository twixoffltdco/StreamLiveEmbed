"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  url: string;
  title: string;
  description: string;
  image: string | null;
  embedHtml: string | null;
  embedUrl: string | null;
  platform: string;
  type: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) {
      setError("Вставьте ссылку");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      // Client-side oEmbed fallback (Rumble/TikTok often blocked on server IPs)
      if (!data.embedUrl && !data.embedHtml) {
        const u = (data.url || url).toLowerCase();
        try {
          if (u.includes("rumble.com")) {
            const oe = await fetch(
              "https://rumble.com/api/Media/oembed.json?url=" + encodeURIComponent(data.url || url)
            ).then((r) => (r.ok ? r.json() : null));
            if (oe?.html) {
              const src = (oe.html.match(/src=["']([^"']+)["']/i) || [])[1];
              data = {
                ...data,
                title: oe.title || data.title,
                image: oe.thumbnail_url || data.image,
                embedHtml: oe.html,
                embedUrl: src || null,
                platform: "Rumble",
                type: "video",
              };
            }
          }
        } catch (_) {}
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Не удалось обработать ссылку");
    } finally {
      setLoading(false);
    }
  }

  function openEmbedPage() {
    if (!result) return;
    const params = new URLSearchParams({
      u: result.url,
      t: result.title,
      d: result.description || "",
      p: result.platform,
    });
    if (result.embedUrl) params.set("e", result.embedUrl);
    if (result.image) params.set("img", result.image);
    router.push(`/e?${params.toString()}`);
  }

  function copyEmbedCode() {
    if (!result?.embedUrl && !result?.embedHtml) return;
    const code = result.embedUrl
      ? `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/e?u=${encodeURIComponent(result.url)}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`
      : result.embedHtml || "";
    navigator.clipboard.writeText(code);
    alert("Код embed скопирован");
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-500/30">
              SL
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">StreamLive Embed</div>
              <div className="text-xs text-slate-500">Универсальный сервис</div>
            </div>
          </div>
          <span className="badge">v1.0</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Вставь ссылку — получи{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              готовый плеер
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-slate-400">
            YouTube, VK, Rutube, Twitch, Vimeo и любые страницы с OG-тегами.
            Название, описание и embed подтягиваются автоматически.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass mx-auto mb-8 max-w-2xl p-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Ссылка на видео или страницу
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              className="input-url flex-1"
              placeholder="https://www.youtube.com/watch?v=... или любая ссылка"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Обработка…
                </>
              ) : (
                "Получить embed"
              )}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </form>

        {/* Result */}
        {result && (
          <div className="glass mx-auto max-w-2xl overflow-hidden">
            {result.image && (
              <div className="relative h-40 w-full overflow-hidden sm:h-52">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.image}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent" />
              </div>
            )}
            <div className="p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="badge">{result.platform}</span>
                <span className="badge">{result.type}</span>
              </div>
              <h2 className="mb-2 text-xl font-semibold leading-snug">{result.title}</h2>
              {result.description && (
                <p className="mb-4 text-sm leading-relaxed text-slate-400 line-clamp-3">
                  {result.description}
                </p>
              )}

              {!result.embedUrl && !result.embedHtml && (
                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {result.platform === "Dzen" ? (
                    <>
                      Дзен не отдаёт embed по обычной ссылке <code className="text-xs">/video/watch/…</code>.
                      Открой видео → «Поделиться» → «Встроить» и вставь ссылку вида{" "}
                      <code className="text-xs">https://dzen.ru/embed/…</code>
                    </>
                  ) : (
                    <>
                      Прямой embed не найден. Можно открыть оригинал или попробовать другую ссылку.
                      Для Rumble/YouTube/VK обычно работает автоматически.
                    </>
                  )}
                </div>
              )}

              {(result.embedUrl || result.embedHtml) && (
                <div className="player-wrap mb-5">
                  {result.embedHtml ? (
                    <div
                      className="absolute inset-0"
                      dangerouslySetInnerHTML={{ __html: result.embedHtml }}
                    />
                  ) : result.embedUrl && /\.(mp4|webm|m3u8)/i.test(result.embedUrl) ? (
                    <video controls playsInline src={result.embedUrl} className="absolute inset-0 h-full w-full" />
                  ) : (
                    <iframe
                      src={result.embedUrl!}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button onClick={openEmbedPage} className="btn-primary text-sm">
                  Открыть страницу плеера
                </button>
                <button
                  onClick={copyEmbedCode}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
                >
                  Копировать iframe
                </button>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
                >
                  Оригинал ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Platforms */}
        <div className="mt-14 text-center">
          <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
            Поддерживаемые платформы
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["YouTube", "VK Video", "Rutube", "Rumble", "Twitch", "Vimeo", "OK.ru", "TikTok", "Dzen", "Direct MP4/HLS"].map(
              (p) => (
                <span
                  key={p}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {p}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        <p>
          Данный сайт создан исключительно для скрипта{" "}
          <strong className="text-slate-300">StreamLive</strong>
        </p>
        <p className="mt-1 text-xs opacity-60">
          Не является самостоятельным видеохостингом. Только генерация embed.
        </p>
      </footer>
    </div>
  );
}
