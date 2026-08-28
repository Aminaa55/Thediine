import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-content px-5 py-32 text-center sm:px-8">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]">
        We could not find that page
      </h1>
      <Link href="/menu" className="btn-primary mt-8">Browse the menu</Link>
    </div>
  );
}
