// The Collection — car image uploads (Supabase Storage).
//
// Real file uploads for car photos, tenant-isolated by the storage.objects RLS
// in migration 0009. Objects live at `{showroomId}/{carFolder}/{uuid}.{ext}`; the
// FIRST path segment (showroomId) is the tenancy key the Storage policies check.
// `photos[]` on a Car stores the returned PUBLIC URL, so the website and
// dashboard render it like any other image URL.

import { supabase } from "./supabase";

export const CAR_IMAGES_BUCKET = "car-images";

// The one image set accepted end-to-end: client validation, the bucket's
// allowed_mime_types, and the RLS extension guard (migration 0009) ALL agree on
// this closed set — so a file that passes the client can never be rejected by the
// policy for its type/extension. SVG is intentionally excluded: image/svg+xml can
// carry inline <script> and is served back with that content-type (stored XSS).
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
/** Supported upload MIME types (mirror of the bucket's allowed_mime_types). */
export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(MIME_TO_EXT);
/** Human list for messages/`accept`, e.g. "JPG, PNG, WebP, AVIF, GIF". */
export const ALLOWED_IMAGE_LABEL = "JPG, PNG, WebP, AVIF, GIF";

/** True if the file is one of the supported image types (by MIME). Use this to
 *  validate BEFORE upload so an unsupported type gets a clear message instead of
 *  an opaque Storage rejection. */
export function isAllowedImageType(file: File): boolean {
  return file.type in MIME_TO_EXT;
}

// getPublicUrl() produces `.../storage/v1/object/public/car-images/<path>`. This
// marker lets us tell OUR Storage URLs apart from legacy external ones (Unsplash
// etc.), so deleteCarImage() only ever touches objects we own.
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${CAR_IMAGES_BUCKET}/`;

/** True if `url` is a car-images object we uploaded (vs. an external/legacy URL). */
export function isCarImageStorageUrl(url: string): boolean {
  return typeof url === "string" && url.includes(PUBLIC_URL_MARKER);
}

/** A v4-ish uuid. crypto.randomUUID() is only defined in secure contexts
 *  (HTTPS/localhost); getRandomValues() is always available, so fall back to it —
 *  keeps uploads working when the dashboard is opened over plain HTTP on a LAN IP. */
export function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10, 16).join("")}`;
}

/** Canonical, RLS-allowed extension for a supported image (from its MIME type).
 *  Derived from MIME (not the filename) so the object key can never carry an
 *  extension the policy rejects — e.g. a JPEG saved as ".jfif" still keys as .jpg. */
function imageExtension(file: File): string {
  return MIME_TO_EXT[file.type] ?? "jpg";
}

/**
 * Upload a car photo and return its public URL.
 *
 * @param file        the image file (validate with isAllowedImageType first).
 * @param showroomId  the OWNING showroom — the admin's active context, or the
 *                    partner's own showroom. Becomes the first path segment, so
 *                    Storage RLS enforces that a partner can only ever write
 *                    under their own showroomId (admin may write any).
 * @param carFolder   grouping folder (the car id when editing, or a per-add-session
 *                    uuid) so all of one car's photos share a folder.
 *
 * The leaf filename is a random uuid + canonical extension — the original filename
 * is never used in the key (no collisions, no unicode/path-injection surface).
 */
export async function uploadCarImage(
  file: File,
  showroomId: string,
  carFolder?: string,
): Promise<string> {
  if (!showroomId) throw new Error("uploadCarImage: showroomId is required.");
  const folder = carFolder && carFolder.length ? carFolder : randomId();
  const path = `${showroomId}/${folder}/${randomId()}.${imageExtension(file)}`;

  const { error } = await supabase.storage.from(CAR_IMAGES_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from(CAR_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Remove a car-images object given its public URL. No-ops (resolves) for any URL
 * that is not one of our Storage URLs — legacy external URLs are left untouched.
 * Storage RLS still applies: a partner can only delete objects under their own
 * showroom path.
 */
export async function deleteCarImage(url: string): Promise<void> {
  const at = url.indexOf(PUBLIC_URL_MARKER);
  if (at === -1) return; // external / legacy URL — nothing of ours to delete
  const path = decodeURIComponent(url.slice(at + PUBLIC_URL_MARKER.length).split("?")[0]);
  if (!path) return;
  const { error } = await supabase.storage.from(CAR_IMAGES_BUCKET).remove([path]);
  if (error) throw error;
}
