# UI rework — palette and measured contrast (2026-10-06)

Source of the values: `docs/UI_CONTRACT.md` Section 4 (amended 2026-10-06, UI rework). Every ratio below
is computed from the sRGB relative-luminance formula (WCAG 2.x), not estimated. Soft fills are the
colour at 0.12 alpha over the theme's `ground`, flattened before measuring.

Thresholds: body and label text 4.5:1, large text, icons, bars and frames 3:1.

## Light theme (default) — ivory ground, charcoal ink

| Token | Hex | On ground | On surface | On raised |
| --- | --- | --- | --- | --- |
| `ground` | `#F3F1EA` (Ivory) | — | — | — |
| `surface` | `#ECE9E1` | 1.07 | — | — |
| `raised` | `#E3DFD5` | 1.18 | — | — |
| `line` | `#CFC9BC` | 1.46 | — | — |
| `text` | `#0B0B0B` (Charcoal) | **17.42** | 16.22 | 14.79 |
| `muted` | `#57534C` | **6.76** | 6.30 | 5.75 |
| `faint` | `#625D56` | **5.77** | 5.38 | 4.90 |
| `accent` | `#0B0B0B` (Charcoal) | **17.42** | 16.22 | 14.79 |
| `accent-hover` | `#2B2A28` | 12.69 | 11.82 | 10.78 |
| `accent-press` | `#000000` | 18.58 | 17.31 | 15.78 |
| `up` | `#1D6B3F` | **5.76** | 5.36 | 4.89 |
| `up-hover` | `#17573A` | 7.55 | 7.03 | 6.41 |
| `up-press` | `#124A2E` | — | — | — |
| `down` | `#A63D2C` | **5.59** | 5.21 | 4.75 |
| `down-hover` | `#8F3324` | 6.97 | 6.49 | 5.92 |
| `down-press` | `#7A2A1D` | 8.54 | 7.95 | 7.25 |
| `candle-up` (chart only) | `#0E8A4A` | — | 3.64 | — |
| `candle-down` (chart only) | `#D63A3A` | — | 3.82 | — |

Ink on fills (`accent-ink` = Ivory `#F3F1EA`): accent 17.42, accent-hover 12.69, accent-press 18.58,
up 5.76, up-hover 7.55, up-press 9.09, down 5.59, down-hover 6.97, down-press 8.54.

Soft fills: `up` on `up-soft` 4.86, `up-hover` on `up-soft` 6.37, `down` on `down-soft` 4.68,
`down-hover` on `down-soft` 5.84.

The first light candidate for `faint` (`#6B665E`) measured 4.28:1 on `raised` and was darkened to
`#625D56` (4.90:1).

## Dark theme — charcoal ground, ivory ink

| Token | Hex | On ground | On surface | On raised |
| --- | --- | --- | --- | --- |
| `ground` | `#0B0B0B` (Charcoal) | — | — | — |
| `surface` | `#141414` | 1.07 | — | — |
| `raised` | `#1C1C1B` | 1.15 | — | — |
| `line` | `#2E2D2B` | 1.43 | — | — |
| `text` | `#F3F1EA` (Ivory) | **17.42** | 16.30 | 15.09 |
| `muted` | `#A8A29A` | **7.78** | 7.28 | 6.74 |
| `faint` | `#8C8780` | **5.52** | 5.17 | 4.79 |
| `accent` | `#F3F1EA` (Ivory) | **17.42** | 16.30 | 15.09 |
| `accent-hover` | `#FFFFFF` | 19.68 | 18.42 | 17.06 |
| `accent-press` | `#D6D2C8` | 13.04 | 12.20 | 11.30 |
| `up` | `#B9E8C9` | **14.48** | 13.55 | 12.55 |
| `up-hover` | `#CBEFD8` | 15.82 | 14.81 | 13.71 |
| `up-press` | `#A6D9B9` | — | — | — |
| `down` | `#C4705F` | **5.46** | 5.11 | 4.73 |
| `down-hover` | `#D08575` | 6.84 | 6.40 | 5.92 |
| `down-press` | `#B46554` | 4.62 | 4.33 | 4.00 |
| `candle-up` (chart only) | `#00E676` | — | 11.04 | — |
| `candle-down` (chart only) | `#FF3B4E` | — | 5.25 | — |

Ink on fills (`accent-ink` = Charcoal `#0B0B0B`): accent 17.42, accent-hover 19.68, accent-press 13.04,
up 14.48, up-hover 15.82, up-press 12.42, down 5.46, down-hover 6.84, down-press 4.62.

Soft fills: `up` on `up-soft` 11.34, `up-hover` on `up-soft` 12.39, `down` on `down-soft` 4.87,
`down-hover` on `down-soft` 6.09.

`down-press` is a fill and a bar colour, never body text, so its 4.00:1 on `raised` is used only at 3:1
duty.

## PNL card — always ivory, in both themes

| Element | Hex | On Ivory `#F3F1EA` |
| --- | --- | --- |
| Figure and text (`charcoal`) | `#0B0B0B` | 17.42 |
| Muted text (charcoal at 70%) | `#514F4E` (computed) | 7.13 |
| Frame and gain bar (`card-accent`) | `#1D6B3F` | 5.76 |
| Loss bar (`card-loss`) | `#7A2A1D` | 8.54 |

## Verdict

Every text token clears 4.5:1 on `ground`, `surface` and `raised` in both themes. Every fill clears 4.5:1
for its ink. Candles clear 3:1 on `surface`. Pass.
