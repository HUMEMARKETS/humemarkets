import Image from "next/image";
import mark from "@/assets/hume-mark.png";

/// The Hume mark, and its wordmark at the `lg` size only (the footer's brand lockup). The mark is an
/// ivory figure on the charcoal ground, so it carries the brand without spending the one accent —
/// the accent stays reserved for what you can act on (docs/UI_CONTRACT.md Section 4). It is decorative
/// beside the wordmark, so it has no alt text of its own. The header (`md`) stays mark-only, cleaner
/// at the header's own smaller scale; the link around it has its own aria-label.
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-3">
      <Image src={mark} alt="" priority className={size === "lg" ? "h-10 w-auto" : "h-8 w-auto"} />
      {size === "lg" ? <span className="text-sm font-medium tracking-[0.32em]">HUME</span> : null}
    </span>
  );
}
