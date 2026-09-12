import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
          Tmap JS SDK는 내부적으로 document.write를 사용해서, next/script 기본 전략
          (비동기 주입)으로 불러오면 "It isn't possible to write into a document
          from an asynchronously-loaded external script" 에러가 난다.
          strategy="beforeInteractive"는 Next.js가 초기 HTML에 직접 심어서
          브라우저가 페이지를 파싱하는 동안 동기적으로 실행되게 해준다 — 일반
          <script> 태그와 동일한 실행 시점이면서 React 리렌더링 경고도 없다.
          지도 렌더링 전용 공개 키만 사용 (서버 전용 TMAP_APP_KEY와 다름).
        */}
        <Script
          src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${process.env.NEXT_PUBLIC_TMAP_MAP_KEY ?? ""}`}
          strategy="beforeInteractive"
        />
      </head>
      <body className="flex h-full flex-col">{children}</body>
    </html>
  );
}
