/**
 * Universal metadata + embed extractor for StreamLive Embed.
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

export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("vk.com") || u.includes("vk.ru") || u.includes("vkvideo.ru"))
    return "VK";
  if (u.includes("rutube.ru")) return "Rutube";
  if (u.includes("twitch.tv")) return "Twitch";
  if (u.includes("vimeo.com")) return "Vimeo";
  if (u.includes("dailymotion.com") || u.includes("dai.ly")) return "Dailymotion";
  if (u.includes("ok.ru") || u.includes("odnoklassniki.ru")) return "OK";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("rumble.com")) return "Rumble";
  if (u.includes("dzen.ru") || u.includes("zen.yandex.ru")) return "Dzen";
  if (u.includes("kinopoisk.ru")) return "Kinopoisk";
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "Facebook";
  if (u.includes("x.com/") || u.includes("twitter.com/")) return "X";
  if (u.includes("streamable.com")) return "Streamable";
  if (u.includes("bilibili.com") || u.includes("b23.tv")) return "Bilibili";
  return "Web";
}

function buildPlatformEmbed(url: string, host = "localhost"): string | null {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1).split("?")[0];
      else if (u.searchParams.get("v")) id = u.searchParams.get("v")!;
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2];
      if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    }

    // VK
    if (
      u.hostname.includes("vk.com") ||
      u.hostname.includes("vk.ru") ||
      u.hostname.includes("vkvideo.ru")
    ) {
      const m = url.match(/video(-?\d+)_(\d+)/i);
      if (m) return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;
      const clip = url.match(/clip(-?\d+)_(\d+)/i);
      if (clip)
        return `https://vk.com/video_ext.php?oid=${clip[1]}&id=${clip[2]}&hd=2`;
    }

    // Rutube
    if (u.hostname.includes("rutube.ru")) {
      const m = u.pathname.match(/\/(?:video|play\/embed)\/([a-f0-9-]+)/i);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }

    // Twitch
    if (u.hostname.includes("twitch.tv")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "videos" && parts[1]) {
        return `https://player.twitch.tv/?video=${parts[1]}&parent=${host}&autoplay=false`;
      }
      if (parts[0] && !["directory", "downloads"].includes(parts[0])) {
        return `https://player.twitch.tv/?channel=${parts[0]}&parent=${host}&autoplay=false`;
      }
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }

    // OK.ru
    if (u.hostname.includes("ok.ru") || u.hostname.includes("odnoklassniki.ru")) {
      const m = url.match(/\/video\/(\d+)/);
      if (m) return `https://ok.ru/videoembed/${m[1]}`;
    }

    // Rumble — page URL needs oEmbed for embed id; if already /embed/ keep it
    if (u.hostname.includes("rumble.com")) {
      if (u.pathname.startsWith("/embed/")) {
        return `https://rumble.com${u.pathname}`;
      }
      // oEmbed will fill this; no direct mapping from v7xxx slug
    }

    // Dzen — only /embed/ links work for iframe
    if (u.hostname.includes("dzen.ru") || u.hostname.includes("zen.yandex.ru")) {
      if (u.pathname.includes("/embed/")) {
        const id = u.pathname.split("/embed/")[1]?.split(/[?/]/)[0];
        if (id)
          return `https://dzen.ru/embed/${id}?from=zen&mute=0&autoplay=0&tv=0`;
      }
      // watch links cannot be converted without scraping share code
    }

    // TikTok
    if (u.hostname.includes("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    }

    // Dailymotion
    if (u.hostname.includes("dailymotion.com") || u.hostname.includes("dai.ly")) {
      let id = "";
      if (u.hostname.includes("dai.ly")) id = u.pathname.slice(1);
      else {
        const m = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
        if (m) id = m[1];
      }
      if (id) return `https://www.dailymotion.com/embed/video/${id}`;
    }

    // Streamable
    if (u.hostname.includes("streamable.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://streamable.com/e/${id}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function tryOEmbed(
  url: string
): Promise<{
  html?: string;
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
} | null> {
  const platform = detectPlatform(url);
  const endpoints: Record<string, string> = {
    YouTube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    Vimeo: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    Rutube: `https://rutube.ru/api/oembed/?url=${encodeURIComponent(url)}&format=json`,
    Rumble: `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`,
    TikTok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    Dailymotion: `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url)}&format=json`,
    Streamable: `https://api.streamable.com/oembed.json?url=${encodeURIComponent(url)}`,
  };

  const endpoint = endpoints[platform];
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildEmbedHtml(embedUrl: string): string {
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(embedUrl)) {
    return `<video controls playsinline src="${embedUrl}" style="width:100%;height:100%;background:#000"></video>`;
  }
  return `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>`;
}

export async function extractFromUrl(
  inputUrl: string,
  host = "localhost"
): Promise<ExtractResult> {
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  // strip tracking junk for cleaner processing (keep original in result)
  const cleanUrl = url.split("#")[0];

  const platform = detectPlatform(cleanUrl);
  let title = "Видео";
  let description = "";
  let image: string | null = null;
  let embedUrl: string | null = buildPlatformEmbed(cleanUrl, host);
  let embedHtml: string | null = null;
  let type: ExtractResult["type"] = "unknown";

  // Direct media
  if (/\.(mp4|webm|m3u8|ogg)(\?|$)/i.test(cleanUrl)) {
    return {
      url,
      title: "Прямой поток / файл",
      description: "Прямая ссылка на медиа",
      image: null,
      embedHtml: null,
      embedUrl: cleanUrl,
      platform: "Direct",
      type: "video",
    };
  }

  // 1) oEmbed first (Rumble, YouTube, Vimeo, TikTok…)
  const oembed = await tryOEmbed(cleanUrl);
  if (oembed) {
    if (oembed.title) title = oembed.title;
    if (oembed.thumbnail_url) image = oembed.thumbnail_url;
    if (oembed.html) {
      embedHtml = oembed.html;
      const src = oembed.html.match(/src=["']([^"']+)["']/i);
      if (src) embedUrl = src[1];
    }
    if (oembed.author_name && !description) {
      description = oembed.author_name;
    }
    type = "video";
  }

  // 2) Fetch page for OG tags + discover embed
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const html = await res.text();

      // Cloudflare challenge page — skip garbage title
      const isCf =
        html.includes("Just a moment") ||
        html.includes("cf-challenge") ||
        html.includes("cf-browser-verification");

      if (!isCf) {
        const pageTitle = getTitle(html);
        if (pageTitle && pageTitle !== "Без названия" && pageTitle !== "Just a moment...") {
          title = pageTitle;
        }
        description =
          description ||
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
          const ogVideo =
            getMeta(html, "og:video") ||
            getMeta(html, "og:video:url") ||
            getMeta(html, "og:video:secure_url");
          if (ogVideo) embedUrl = ogVideo;
        }

        // Dzen: try to find embed id in page
        if (!embedUrl && platform === "Dzen") {
          const dzenEmbed =
            html.match(/https?:\/\/dzen\.ru\/embed\/([a-zA-Z0-9_-]+)/) ||
            html.match(/https?:\/\/zen\.yandex\.ru\/embed\/([a-zA-Z0-9_-]+)/);
          if (dzenEmbed) {
            embedUrl = `https://dzen.ru/embed/${dzenEmbed[1]}?from=zen&mute=0&autoplay=0&tv=0`;
          }
        }
      }

      type = embedUrl || embedHtml ? "video" : type === "unknown" ? "page" : type;
    }
  } catch (e) {
    console.error("[extract] fetch error", e);
  }

  // 3) Fallback title from URL path if still generic
  if (title === "Видео" || title === "Без названия") {
    try {
      const path = new URL(cleanUrl).pathname.replace(/\/+/g, " ").trim();
      if (path.length > 3) {
        title = decodeURIComponent(path)
          .replace(/[-_]+/g, " ")
          .replace(/\.\w+$/, "")
          .slice(0, 120)
          .trim() || title;
      }
    } catch {
      /* ignore */
    }
  }

  if (!embedHtml && embedUrl) {
    embedHtml = buildEmbedHtml(embedUrl);
  }

  // 4) Last resort: if we have no embed but it's a known video platform,
  // still mark as video page so UI isn't "unknown"
  if (!embedUrl && ["Rumble", "Dzen", "TikTok", "Instagram", "Facebook", "X"].includes(platform)) {
    type = "page";
  }

  return {
    url,
    title: String(title).slice(0, 200),
    description: String(description).slice(0, 500),
    image,
    embedHtml,
    embedUrl,
    platform,
    type,
  };
}
