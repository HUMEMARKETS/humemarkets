import Image from "next/image";
import mark from "@/assets/hume-mark.png";

/// The HUME mark (a Möbius ring, from `assets/hume-logo.svg`, rasterised once to `hume-mark.png`) with
/// the name "HUME" beside it. The ring is pale metal on the charcoal ground, so it carries the brand
/// without spending the one accent (docs/UI_CONTRACT.md Section 4). The image is decorative beside the
/// text, so it has no alt text; the link around the logo has its own aria-label. `sm` is the footer and
/// share-card size.
export function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span className="inline-flex items-center gap-2 sm:gap-3">
      <Image src={mark} alt="" priority className={size === "sm" ? "h-8 w-auto" : "h-8 w-auto sm:h-11"} />
      <span className={size === "sm" ? "font-display text-xl font-bold tracking-[-0.02em]" : "font-display text-[1.35rem] font-bold leading-none tracking-[-0.03em] sm:text-[1.65rem]"}>
        HUME
      </span>
    </span>
  );
}
