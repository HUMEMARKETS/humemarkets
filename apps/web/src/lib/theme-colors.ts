/// The palette values that render outside Tailwind's reach — the browser-chrome `themeColor` in
/// `layout.tsx`, the edge-rendered `opengraph-image.tsx`, and the canvas in `HeroSilkBackground`,
/// which reads the CSS variables at runtime and needs a literal to fall back to before the
/// stylesheet resolves. They mirror `globals.css`'s `--color-ground` / `--color-text` /
/// `--color-muted` / `--color-accent` (docs/UI_CONTRACT.md Section 4). If the palette moves, this is
/// the one other place to update, and `scripts/check-hex.sh` allows hex literals only here.
export const THEME_GROUND = "#0b0b0b";
export const THEME_TEXT = "#f3f1ea";
export const THEME_MUTED = "#a8a29a";
export const THEME_ACCENT = "#6b7f6b";

/// The same four as RGB triples, for the canvas, which mixes colours numerically.
export const THEME_GROUND_RGB: [number, number, number] = [11, 11, 11];
export const THEME_ACCENT_RGB: [number, number, number] = [107, 127, 107];

/// The PNL card's two extra values, for the edge-rendered share image, which cannot read Tailwind. The
/// card is the one light surface (docs/UI_CONTRACT.md Section 4): charcoal and sage on ivory. `down-press`
/// is the loss bar, the derived token the palette already carries (3.8:1 on ivory, enough for a bar, which
/// needs 3:1). The muted ink is charcoal at 70% over ivory, which is what `text-ground/70` computes to on
/// the in-app card (7.2:1).
export const THEME_DOWN_PRESS = "#b46554";
export const THEME_CARD_MUTED = "#514f4e";
