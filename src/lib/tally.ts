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
