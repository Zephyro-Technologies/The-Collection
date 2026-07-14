import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const FALLBACK =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80";

/**
 * Swappable car gallery: a main image plus a thumbnail strip and prev/next
 * arrows. URL-based (file uploads via Supabase Storage are a later enhancement).
 */
export function CarGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const imgs = photos.length ? photos : [FALLBACK];
  const [index, setIndex] = useState(0);

  // Reset to the cover when the set of photos actually changes (e.g. a different
  // car). Keyed on the joined URLs so a same-contents re-render doesn't reset.
  const key = imgs.join("|");
  useEffect(() => setIndex(0), [key]);

  const safeIndex = Math.min(index, imgs.length - 1);
  const go = (delta: number) => setIndex((cur) => (cur + delta + imgs.length) % imgs.length);

  return (
    <div>
      <div className="relative aspect-[16/10] bg-platinum-soft rounded-lg overflow-hidden">
        <ImageWithFallback src={imgs[safeIndex]} alt={alt} className="w-full h-full object-cover" />
        {imgs.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/85 text-noir hover:bg-white shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/85 text-noir hover:bg-white shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
            <div
              className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-noir/70 text-white"
              style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}
            >
              {safeIndex + 1} / {imgs.length}
            </div>
          </>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imgs.map((url, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                i === safeIndex ? "border-accent" : "border-transparent hover:border-accent/40"
              }`}
            >
              <ImageWithFallback src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
