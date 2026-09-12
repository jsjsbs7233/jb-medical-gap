import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "소아과 도착시간 지도",
  description: "행정구역이 아니라 도착 시간으로 의료권을 다시 그립니다.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        {/* Tmap JavaScript API v2 — 지도 렌더링 전용 공개 키만 사용 (서버 전용 TMAP_APP_KEY와 다름) */}
        <Script
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${process.env.NEXT_PUBLIC_TMAP_MAP_KEY ?? ""}`}
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
