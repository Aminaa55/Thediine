import { LOGO_SRC, BRAND } from "@/lib/brand";

/**
 * The logo is never recreated, redrawn or approximated.
 *
 * When the official asset is supplied (see public/brand/README.md) it is used
 * everywhere. Until then this renders the name set in the brand typeface —
 * typography, not an invented mark.
 */
export function Logo({
  className = "",
  size = "md",
  onDark = false,
}: {
  className?: string;
  size?: "header" | "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  // "header" grows with the bar it sits in: 44px inside the 64px mobile bar,
  // 56px inside the 80px one on desktop. Same file, same proportions — only
  // the height is set, so the width follows on its own.
  const heights = { header: "h-11 sm:h-14", sm: "h-8", md: "h-10", lg: "h-16" };
  const text = {
    header: "text-[17px] sm:text-[20px]",
    sm: "text-[14px]", md: "text-[16px]", lg: "text-[22px]",
  };

  if (LOGO_SRC) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={LOGO_SRC}
        alt={BRAND.name}
        className={`${heights[size]} w-auto ${className}`}
      />
    );
  }

  return (
    <span
      className={`font-display font-semibold uppercase leading-none tracking-[0.2em] ${
        text[size]
      } ${onDark ? "text-cream" : "text-ink"} ${className}`}
    >
      {BRAND.name}
    </span>
  );
}
