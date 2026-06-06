export const CHAT_BACKGROUNDS = [
  { id: "pink-cloud", name: "Mây hồng", css: "linear-gradient(180deg, oklch(0.97 0.03 350), oklch(0.92 0.07 350))" },
  { id: "candy", name: "Kẹo bông", css: "linear-gradient(135deg, oklch(0.94 0.05 350), oklch(0.92 0.06 280))" },
  { id: "sunset", name: "Hoàng hôn", css: "linear-gradient(180deg, oklch(0.9 0.1 40), oklch(0.85 0.13 0))" },
  { id: "ocean", name: "Biển đêm", css: "linear-gradient(180deg, oklch(0.45 0.12 240), oklch(0.25 0.1 280))" },
  { id: "matcha", name: "Trà xanh", css: "linear-gradient(180deg, oklch(0.94 0.06 140), oklch(0.88 0.08 160))" },
  { id: "night", name: "Đêm đen", css: "linear-gradient(180deg, oklch(0.2 0.04 280), oklch(0.12 0.03 280))" },
] as const;

export function getBgCss(id: string | null | undefined) {
  return CHAT_BACKGROUNDS.find((b) => b.id === id)?.css ?? CHAT_BACKGROUNDS[0].css;
}
