/**
 * Placeholder artwork, shown until a real photograph is uploaded.
 *
 * When `Product.imageUrl` is set in admin, the photo replaces this with no
 * code change. The placeholder is deliberately brand-shaped rather than a
 * stock photo of somebody else's food.
 */

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const WASHES = [
  ["#F7E7CE", "#EBD3A8"],
  ["#F3E4D2", "#E4CBA6"],
  ["#F8EBDA", "#E8D2B0"],
  ["#F1E2C9", "#E0C79C"],
];

export function DishImage({
  name,
  src,
  className = "",
  priority = false,
}: {
  name: string;
  src?: string | null;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const seed = hash(name);
  const [from, to] = WASHES[seed % WASHES.length];
  const initial = name.trim().charAt(0).toUpperCase();
  const rotate = (seed % 30) - 15;

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)` }}
      role="img"
      aria-label={name}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        style={{ transform: `rotate(${rotate}deg) scale(1.15)` }}
      >
        <circle cx="100" cy="100" r="72" fill="none" stroke="#A87E2E" strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#A87E2E" strokeOpacity="0.14" strokeWidth="1" />
        <circle cx="46" cy="100" r="2.4" fill="#3B2310" fillOpacity="0.3" />
        <circle cx="154" cy="100" r="2.4" fill="#3B2310" fillOpacity="0.3" />
      </svg>
      <span
        className="relative font-display text-5xl font-semibold text-ink/25"
        aria-hidden="true"
      >
        {initial}
      </span>
    </div>
  );
}
