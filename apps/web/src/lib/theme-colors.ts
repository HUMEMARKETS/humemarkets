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
