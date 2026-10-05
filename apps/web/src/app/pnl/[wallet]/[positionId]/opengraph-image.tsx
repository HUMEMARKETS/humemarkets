import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { cardPartsFromApi, cardProps } from "@/lib/pnlCard";
import { loadPnlCard } from "@/lib/pnlCardApi";
import { THEME_CARD_ACCENT, THEME_CARD_MUTED, THEME_DOWN_PRESS, THEME_GROUND, THEME_TEXT } from "@/lib/theme-colors";

export const alt = "A Hume PNL card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/// The shareable PNL card as an image. It is the in-app `PnlCard` laid out for 1200 x 630: ivory ground,
/// charcoal figure, green frame, one number that dominates (docs/UI_CONTRACT.md Sections 4 and 5). Same
/// formatter as the page (`cardProps`), so the image and the page can never disagree on a figure. The edge
/// renderer takes inline styles only, which is why the colours come from `theme-colors.ts`.
export default async function PnlCardImage({ params }: { params: Promise<{ wallet: string; positionId: string }> }) {
  const { wallet, positionId } = await params;
  const mark = await readFile(join(process.cwd(), "src/assets/hume-mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  const result = await loadPnlCard(wallet, positionId);

  if (result.kind !== "ok") {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", background: THEME_TEXT, color: THEME_GROUND, border: `8px solid ${THEME_CARD_ACCENT}` }}>
          <div style={{ fontSize: 56, letterSpacing: 14, fontWeight: 500 }}>HUME</div>
          <div style={{ fontSize: 34, color: THEME_CARD_MUTED, marginTop: 24 }}>This PNL card is not available.</div>
        </div>
      ),
      size,
    );
  }

  const p = cardProps(cardPartsFromApi(result.card));
  const barColour = p.direction === "loss" ? THEME_DOWN_PRESS : p.direction === "gain" ? THEME_CARD_ACCENT : THEME_CARD_MUTED;
  const label = (text: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 64 }}>
      <div style={{ fontSize: 24, color: THEME_CARD_MUTED }}>{text}</div>
      <div style={{ fontSize: 38, fontWeight: 500 }}>{value}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 72px", background: THEME_TEXT, color: THEME_GROUND, border: `8px solid ${THEME_CARD_ACCENT}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markSrc} width={72} height={50} alt="" style={{ marginRight: 20 }} />
            <div style={{ fontSize: 30, letterSpacing: 10, fontWeight: 500 }}>HUME</div>
          </div>
          {p.sample ? <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, background: THEME_GROUND, color: THEME_TEXT, padding: "6px 14px" }}>SAMPLE DATA</div> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 40, fontWeight: 500 }}>
            {p.symbol}-PERP
            <span style={{ fontSize: 28, marginLeft: 20, letterSpacing: 3 }}>{`${p.side.toUpperCase()} ${p.leverage}X`}</span>
            <span style={{ fontSize: 24, marginLeft: 20, letterSpacing: 3, color: THEME_CARD_MUTED }}>{p.status.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", marginTop: 24 }}>
            <div style={{ width: 14, background: barColour, marginRight: 32 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, letterSpacing: 4, color: THEME_CARD_MUTED }}>TOTAL PNL</div>
              <div style={{ fontSize: 132, fontWeight: 300, letterSpacing: -4, lineHeight: 1.05 }}>{p.pnl}</div>
              <div style={{ fontSize: 44 }}>{p.roi}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", borderTop: `2px solid ${THEME_CARD_MUTED}`, paddingTop: 24 }}>
          {label("Entry", p.entry)}
          {label(p.status === "open" ? "Mark" : "Exit", p.exit ?? "–")}
          {label("Size", p.size)}
          <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", alignItems: "flex-end", fontSize: 24, color: THEME_CARD_MUTED }}>{p.period ?? ""}</div>
        </div>
      </div>
    ),
    size,
  );
}
