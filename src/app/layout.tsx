import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamLive Embed — Универсальный плеер",
  description:
    "Вставьте ссылку на любое видео — получите готовый embed с названием, описанием и плеером. Создано исключительно для скрипта StreamLive.",
  openGraph: {
    title: "StreamLive Embed",
    description: "Универсальный сервис встраивания видео для StreamLive",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
