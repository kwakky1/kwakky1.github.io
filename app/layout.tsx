import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const GA_MEASUREMENT_ID = "G-VNW35SJF7Z";

export const metadata: Metadata = {
  metadataBase: new URL("https://kwakky1.github.io"),
  title: {
    default: "Andy's Blog",
    template: "%s | Andy's Blog",
  },
  description: "This is Andy's blog",
  icons: {
    icon: [
      { url: "/assets/logos/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logos/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/assets/logos/apple-touch-icon.png",
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

// 다크모드 깜빡임 방지: 하이드레이션 전에 저장된 테마를 즉시 적용
const themeInitScript = `
(function () {
  var stored = localStorage.getItem("theme");
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (stored === "dark" || (!stored && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 min-h-screen flex flex-col transition-colors`}>
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
