/**
 * Universal metadata + embed extractor for StreamLive Embed service.
 */

export interface ExtractResult {
  url: string;
  title: string;
  description: string;
  image: string | null;
  embedHtml: string | null;
  embedUrl: string | null;
  platform: string;
  type: "video" | "page" | "unknown";
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function getMeta(html: string, prop: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i"
  );
  const m = html.match(re1) || html.match(re2);
  return m ? decodeHtml(m[1].trim()) : null;
}

function getTitle(html: string): string {
  return (
    getMeta(html, "og:title") ||
    getMeta(html, "twitter:title") ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim() ||
    "Без названия"
  );
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("vk.com") || u.includes("vk.ru") || u.includes("vkvideo.ru"))
    return "VK";
  if (u.includes("rutube.ru")) return "Rutube";
  if (u.includes("twitch.tv")) return "Twitch";
  if (u.includes("vimeo.com")) return "Vimeo";
  if (u.includes("dailymotion.com")) return "Dailymotion";
  if (u.includes("ok.ru") || u.includes("odnoklassniki.ru")) return "OK";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("kinopoisk.ru")) return "Kinopoisk";
  return "Web";
}

function buildPlatformEmbed(url: string, host = "localhost"): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1).split("?")[0];
      else if (u.searchParams.get("v")) id = u.searchParams.get("v")!;
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    }

    if (
      u.hostname.includes("vk.com") ||
      u.hostname.includes("vk.ru") ||
      u.hostname.includes("vkvideo.ru")
    ) {
      const m = url.match(/video(-?\d+)_(\d+)/i);
      if (m) return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;
      const clip = url.match(/clip(-?\d+)_(\d+)/i);
      if (clip) return `https://vk.com/video_ext.php?oid=${clip[1]}&id=${clip[2]}&hd=2`;
    }

    if (u.hostname.includes("rutube.ru")) {
      const m = u.pathname.match(/\/(?:video|play\/embed)\/([a-f0-9-]+)/i);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }

    if (u.hostname.includes("twitch.tv")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "videos" && parts[1]) {
        return `https://player.twitch.tv/?video=${parts[1]}&parent=${host}&autoplay=false`;
      }
      if (parts[0] && !["directory", "downloads"].includes(parts[0])) {
        return `https://player.twitch.tv/?channel=${parts[0]}&parent=${host}&autoplay=false`;
      }
    }

    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }

    if (u.hostname.includes("ok.ru") || u.hostname.includes("odnoklassniki.ru")) {
      const m = url.match(/\/video\/(\d+)/);
      if (m) return `https://ok.ru/videoembed/${m[1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function tryOEmbed(url: string): Promise<{ html?: string; title?: string; thumbnail_url?: string } | null> {
  const endpoints: Record<string, string> = {
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    vimeo: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    rutube: `https://rutube.ru/api/oembed/?url=${encodeURIComponent(url)}&format=json`,
  };
  const platform = detectPlatform(url).toLowerCase();
  const endpoint = endpoints[platform];
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function extractFromUrl(
  inputUrl: string,
  host = "localhost"
): Promise<ExtractResult> {
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const platform = detectPlatform(url);
  let title = "Видео";
  let description = "";
  let image: string | null = null;
  let embedUrl: string | null = buildPlatformEmbed(url, host);
  let embedHtml: string | null = null;
  let type: ExtractResult["type"] = "unknown";

  if (/\.(mp4|webm|m3u8|ogg)(\?|$)/i.test(url)) {
    return {
      url,
      title: "Прямой поток / файл",
      description: "Прямая ссылка на медиа",
      image: null,
      embedHtml: null,
      embedUrl: url,
      platform: "Direct",
      type: "video",
    };
  }

  const oembed = await tryOEmbed(url);
  if (oembed) {
    if (oembed.title) title = oembed.title;
    if (oembed.thumbnail_url) image = oembed.thumbnail_url;
    if (oembed.html) {
      embedHtml = oembed.html;
      const src = oembed.html.match(/src=["']([^"']+)["']/i);
      if (src) embedUrl = src[1];
    }
    type = "video";
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();
      const pageTitle = getTitle(html);
      if (pageTitle && pageTitle !== "Без названия") title = pageTitle;
      description =
        getMeta(html, "og:description") ||
        getMeta(html, "description") ||
        getMeta(html, "twitter:description") ||
        "";
      image =
        image ||
        getMeta(html, "og:image") ||
        getMeta(html, "twitter:image") ||
        null;

      if (!embedUrl) {
        const iframeMatch = html.match(
          /<iframe[^>]+src=["'](https?:\/\/[^"']+(?:embed|player|video)[^"']*)["']/i
        );
        if (iframeMatch) embedUrl = iframeMatch[1];
      }

      if (!embedUrl) {
        const ogVideo = getMeta(html, "og:video") || getMeta(html, "og:video:url");
        if (ogVideo) embedUrl = ogVideo;
      }

      type = embedUrl || embedHtml ? "video" : "page";
    }
  } catch (e) {
    console.error("[extract] fetch error", e);
  }

  if (!embedHtml && embedUrl) {
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(embedUrl)) {
      embedHtml = `<video controls playsinline src="${embedUrl}" style="width:100%;height:100%;background:#000"></video>`;
    } else {
      embedHtml = `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`;
    }
  }

  return {
    url,
    title: title.slice(0, 200),
    description: description.slice(0, 500),
    image,
    embedHtml,
    embedUrl,
    platform,
    type,
  };
}
