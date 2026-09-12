import type { Metadata } from "next";
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
      <head>
        {/*
          Tmap JS SDK는 내부적으로 document.write를 사용해서, next/script(비동기 주입)로
          불러오면 "It isn't possible to write into a document from an
          asynchronously-loaded external script" 에러가 난다.
          그래서 여기서는 일반 <script> 태그로 그대로 둬서 브라우저가 HTML을 파싱하는
          동안 동기적으로(막으면서) 실행되게 한다 — 지도 렌더링 전용 공개 키만 사용
          (서버 전용 TMAP_APP_KEY와 다름).
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${process.env.NEXT_PUBLIC_TMAP_MAP_KEY ?? ""}`}
        />
      </head>
      <body className="flex h-full flex-col">{children}</body>
    </html>
  );
}
