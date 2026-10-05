import type { NextConfig } from "next";

// 보안 헤더 — HSTS는 Vercel이 기본으로 붙인다
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // ponytail: CSP 없음 — 인라인 js 플래그·Next 런타임 스크립트에 nonce가 필요. 외부 스크립트 0이라 보류
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
