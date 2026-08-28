export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold uppercase leading-none tracking-[0.2em] ${className}`}>
      The Diine
    </span>
  );
}

/** The spoon-and-fork mark from the logo, simplified for small sizes. */
export function Emblem({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
      <circle cx="24" cy="24" r="22.5" stroke="currentColor" strokeOpacity="0.45" />
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeOpacity="0.2" />
      <ellipse cx="30.5" cy="20" rx="5.5" ry="3.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M25 20H15.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M14 27h18M17 27v-3.2M20 27v-3.2M23 27v-3.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
