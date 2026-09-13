import { ImageResponse } from 'next/og';

// "골든타임" 컨셉에 맞춰 스톱워치 이모지로 파비콘을 만든다.
// Next.js App Router 규칙 — 이 파일 하나로 /icon 라우트와 <link rel="icon">이 자동 생성된다.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 24 }}>⏱️</span>
      </div>
    ),
    { ...size }
  );
}
