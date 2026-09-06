import { BACKEND_URL } from "./api";

/**
 * Builds a playable video URL from whatever value the backend returned for
 * "filename" (or the older/raw "filepath").
 *
 * This fixes the original bug where malformed values like:
 *   uploads\myvideo.mp4
 * produced broken frontend URLs such as:
 *   /uploads/uploads\myvideo.mp4
 *   /myvideo.mp4
 *
 * Rule: always build the URL as BACKEND_URL + "/uploads/" + normalizedFilename,
 * where normalizedFilename has backslashes converted to forward slashes and
 * any leading "uploads/" segment stripped before re-adding it once.
 */
export function getVideoUrl(rawFilenameOrPath?: string | null): string {
  if (!rawFilenameOrPath) return "";

  let clean = rawFilenameOrPath.trim();
  clean = clean.replace(/\\/g, "/");

  while (clean.toLowerCase().startsWith("uploads/")) {
    clean = clean.slice("uploads/".length);
  }
  clean = clean.replace(/^\/+/, "");

  const segments = clean.split("/");
  clean = segments[segments.length - 1];

  return `${BACKEND_URL}/uploads/${clean}`;
}
