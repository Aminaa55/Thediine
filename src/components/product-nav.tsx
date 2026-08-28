"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Back navigation above a dish. Named for the category, so it says where it goes. */
export function BackToCategory({
  categorySlug,
  categoryName,
}: {
  categorySlug: string;
  categoryName: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-7">
      <button
        type="button"
        onClick={() => router.back()}
        className="group flex items-center gap-2 text-[15px] text-ink transition-colors hover:text-gold"
      >
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:-translate-x-1"
        >
          &larr;
        </span>
        Back to {categoryName}
      </button>
      <span className="text-ink-faint" aria-hidden="true">
        &middot;
      </span>
      <Link href="/menu" className="text-[15px] text-ink-soft hover:text-ink">
        Full menu
      </Link>
    </div>
  );
}
