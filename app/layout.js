import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "makemymeal.com",
  description: "Peanut butter & banana sandwiches, made fresh to your order.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F2C230" };

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
