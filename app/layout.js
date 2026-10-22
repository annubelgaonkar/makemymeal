import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "makemymeal",
  description: "Peanut butter & banana sandwiches, made fresh to your order.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFFFFF" };

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('mm_theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Young+Serif&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
