import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEME_GROUND, THEME_MUTED, THEME_TEXT } from "@/lib/theme-colors";

export const alt = "HUME — Global markets, onchain.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social preview. The same palette as the light theme in globals.css, through `theme-colors.ts`: ivory
// ground, charcoal text, stone for the line beneath it. The mark is a pale metal ring; no accent is spent here.
export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "src/assets/hume-mark.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: THEME_GROUND,
          color: THEME_TEXT,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} width={216} height={115} alt="" style={{ marginBottom: 44 }} />
        <div style={{ fontSize: 96, letterSpacing: -2, fontWeight: 700 }}>HUME</div>
        <div style={{ fontSize: 34, color: THEME_MUTED, marginTop: 28 }}>Global markets, onchain.</div>
      </div>
    ),
    size,
  );
}
