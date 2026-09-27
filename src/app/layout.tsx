import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// 가변 폰트 1개로 전 두께 커버 (45~920)
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "씀 — 반복 지출 즉시 피드백",
  description: "감시 대상으로 정한 지출을 쓰는 순간 바로 보여주는 가계부",
};

// no-JS면 클래스 미부여 → 콘텐츠 그대로 노출 (PRD §3.2)
const JS_FLAG = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      // 아래 인라인 스크립트가 하이드레이션 전에 js 클래스를 붙인다
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${pretendard.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
