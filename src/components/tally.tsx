/** 5개 묶음 정(正)자 작대기 좌표. scale로 축소본 생성 */
export function tally(n: number, scale = 1) {
  const out: { left: number; top: number; w: number; h: number; rot: string }[] = [];
  for (let i = 0; i < n; i++) {
    const group = Math.floor(i / 5);
    const k = i % 5;
    if (k < 4) {
      out.push({ left: (group * 52 + k * 9) * scale, top: 0, w: Math.max(2, 3 * scale), h: 28 * scale, rot: "none" });
    } else {
      out.push({ left: (group * 52 - 6) * scale, top: 12 * scale, w: 40 * scale, h: Math.max(2, 3 * scale), rot: "rotate(-24deg)" });
    }
  }
  return out;
}

type StrokesProps = {
  n: number;
  scale?: number;
  /** 획 색 클래스. 함수면 획 순번별 (예: 채운 칸만 강조) */
  stroke: string | ((i: number) => string);
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "className" | "style">;

/** 탈리 획 렌더 — 부모는 relative 박스. data-* 등 나머지 속성은 획마다 붙는다 */
export function TallyStrokes({ n, scale, stroke, ...rest }: StrokesProps) {
  return tally(n, scale).map((s, i) => (
    <span
      key={i}
      {...rest}
      className={`absolute origin-center ${typeof stroke === "string" ? stroke : stroke(i)}`}
      style={{ left: s.left, top: s.top, width: s.w, height: s.h, transform: s.rot }}
    />
  ));
}
