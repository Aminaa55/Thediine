import { db } from "./db";

export type Placement = "HOME" | "EVENTS";

/**
 * "Our Work" images, managed entirely from admin — added, removed and reordered
 * without a developer. Nothing here is hardcoded.
 */
export async function getGallery(placement: Placement, take?: number) {
  return db.galleryImage.findMany({
    where: {
      isActive: true,
      OR: [{ placement: "BOTH" }, { placement }],
    },
    orderBy: { sortOrder: "asc" },
    take,
    select: { id: true, imageUrl: true, altEn: true, captionEn: true },
  });
}
