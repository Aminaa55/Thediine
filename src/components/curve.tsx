/**
 * A soft arc between two sections, instead of a hard horizontal rule.
 *
 * `to` is the colour of the section BELOW; the curve is drawn in it so the two
 * grounds meet on an organic edge rather than a straight line.
 */
export function Curve({
  to = "cream",
  flip = false,
  className = "",
}: {
  to?: "cream" | "cream-warm" | "cream-deep" | "cream-toast";
  flip?: boolean;
  className?: string;
}) {
  const fill = {
    cream: "#FBF1E4",
    "cream-warm": "#FFFAF3",
    "cream-deep": "#F4E5CE",
    "cream-toast": "#EBD7B4",
  }[to];

  return (
    <div className={`relative -mb-px leading-[0] ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className={`block h-[46px] w-full sm:h-[80px] ${flip ? "rotate-180" : ""}`}
      >
        <path d="M0,90 C300,10 620,0 900,26 C1120,47 1290,72 1440,90 Z" fill={fill} />
      </svg>
    </div>
  );
}

/** A small gold arc used as a brand accent beside headings. */
export function GoldArc({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" className={className} fill="none" aria-hidden="true">
      <path d="M1 23C1 11 14 1 30 1s29 10 29 22" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="30" cy="1.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

/** Three dots — the brand's smallest punctuation mark. */
export function Dots({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 6" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="2.2" />
      <circle cx="17" cy="3" r="2.2" opacity=".55" />
      <circle cx="31" cy="3" r="2.2" opacity=".3" />
    </svg>
  );
}
