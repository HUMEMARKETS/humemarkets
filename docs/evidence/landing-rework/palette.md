# Palette amendment, 2026-10-06

Sage accent `#6B7F6B` replaced by signal green `#22E06B`. Dark elevation steps gain a faint green cast.
Token names are unchanged. Source of truth: `docs/UI_CONTRACT.md` Section 4.

Contrast computed from the sRGB relative-luminance formula against the values in
`apps/web/src/app/globals.css`.

| Pair | Ratio |
| --- | --- |
| text `#F3F1EA` on ground / surface / raised | 17.28 / 16.33 / 15.15 |
| muted `#A8A29A` on ground / surface / raised | 7.72 / 7.29 / 6.77 |
| faint `#8C8780` on ground / surface / raised | 5.48 / 5.18 / 4.81 |
| accent `#22E06B` on ground / surface / raised / accent-soft | 11.11 / 10.49 / 9.74 / 9.29 |
| accent-hover `#4AEA88` on ground / surface / raised | 12.48 / 11.79 / 10.94 |
| accent-press `#1FC95F` on ground / surface / raised | 8.91 / 8.42 / 7.81 |
| ink `#0A0D0B` on accent / hover / press | 11.11 / 12.48 / 8.91 |
| ivory on accent (rejected) | 1.56 |
| up `#B9E8C9` on ground / surface / raised | 14.37 / 13.58 / 12.60 |
| down `#C4705F` on ground / surface / raised | 5.42 / 5.12 / 4.75 |
| down-hover `#D08575` on ground | 6.78 |
| down-press `#B46554` on ground, ink on it | 4.58, 4.58 |
| up on up-soft, up-hover on up-soft | 11.26, 12.31 |
| down on down-soft, down-hover on down-soft | 4.81, 6.02 |
| card-accent `#0F8F3E` on ivory (frame and bar, needs 3:1) | 3.70 |
| bright accent on ivory (rejected for the card) | 1.56 |
| elevation: surface / raised / line vs ground | 1.06 / 1.14 / 1.43 |

All body-text pairs are at least 4.5:1. The two rejected pairs are not used anywhere.
