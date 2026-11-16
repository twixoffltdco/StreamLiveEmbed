import type { Metadata } from "next";
import { extractFromUrl } from "@/lib/extract";

type SearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const t = (searchParams.t as string) || "StreamLive Embed";
  const d = (searchParams.d as string) || "Плеер StreamLive";
  const img = searchParams.img as string | undefined;
  return {
    title: t,
    description: d,
    openGraph: {
      title: t,
      description: d,
      images: img ? [img] : undefined,
      type: "video.other",
    },
  };
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawUrl = (searchParams.u as string) || "";
  const titleParam = (searchParams.t as string) || "";
  const descParam = (searchParams.d as string) || "";
  const embedParam = (searchParams.e as string) || "";
  const imgParam = (searchParams.img as string) || "";
  const platformParam = (searchParams.p as string) || "";

  let title = titleParam || "Видео";
  let description = descParam;
  let embedUrl = embedParam || null;
  let embedHtml: string | null = null;
  let image = imgParam || null;
  let platform = platformParam || "Web";

  // If only URL given — extract on server
  if (rawUrl && !embedParam) {
    try {
      const data = await extractFromUrl(rawUrl);
      title = data.title || title;
      description = data.description || description;
      embedUrl = data.embedUrl;
      embedHtml = data.embedHtml;
      image = data.image || image;
      platform = data.platform;
    } catch {
      /* keep params */
    }
  }

  if (!embedHtml && embedUrl) {
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(embedUrl)) {
      embedHtml = `<video controls playsinline autoplay src="${embedUrl}" style="width:100%;height:100%;background:#000"></video>`;
    } else {
      embedHtml = `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`;
    }
  }

  const hasPlayer = !!(embedHtml || embedUrl);

  return (
    <div className="min-h-screen bg-[#05070e]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold">
              SL
            </span>
            StreamLive Embed
          </a>
          <span className="badge">{platform}</span>
        </div>

        {/* Player */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-blue-900/20">
          {hasPlayer ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <div
                className="absolute inset-0"
                dangerouslySetInnerHTML={{
                  __html:
                    embedHtml ||
                    `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`,
                }}
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-900 text-slate-500">
              <div className="text-center">
                <p className="mb-2 text-lg">Плеер недоступен</p>
                {rawUrl && (
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    Открыть оригинал
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="mt-6">
          <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              {description}
            </p>
          )}
          {rawUrl && (
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-slate-500 hover:text-blue-400"
            >
              Источник: {rawUrl.length > 70 ? rawUrl.slice(0, 70) + "…" : rawUrl}
            </a>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-slate-600">
          Данный сайт создан исключительно для скрипта StreamLive
        </p>
      </div>
    </div>
  );
}
