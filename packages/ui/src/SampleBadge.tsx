import { cn } from "./cn.js";

/// The mark on every sample surface: a balance, a position, a page title, the header. It is a label,
/// not a control, and nothing dismisses it: an unlabelled simulation is a liability, and a person must
/// never believe a sample position is theirs. Sage text sits on `accent-soft` here, which is 4.80:1 with
/// `accent-hover` (UI_CONTRACT.md Section 4.1), so it clears AA at this size.
export function SampleBadge({ className, label = "Sample data", onLight = false }: { className?: string; label?: string; onLight?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-sharp border px-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.1em]",
        // On the ivory PNL card the dark-surface treatment would be sage on ivory, 3.81:1. Charcoal on ivory is 17.42:1.
        onLight ? "border-ground bg-ground text-text" : "border-accent-line bg-accent-soft text-accent-hover",
        className,
      )}
    >
      {label}
    </span>
  );
}
