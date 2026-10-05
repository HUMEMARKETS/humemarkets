/// What the landing page shows when WebGL is not available: concentric rings and a green wash drawn
/// with the page tokens, so the page keeps its shape and the text is the same. No script, no canvas.
export function StaticScene() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_42%,var(--color-accent-soft),transparent_62%)]" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full text-line md:left-[22%]">
        {[14, 24, 34, 44, 54].map((radius) => (
          <circle key={radius} cx="50" cy="46" r={radius} fill="none" stroke="currentColor" strokeWidth="0.15" />
        ))}
        <circle cx="50" cy="46" r="4" fill="none" stroke="var(--color-accent)" strokeWidth="0.3" />
      </svg>
    </div>
  );
}
