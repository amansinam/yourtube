// Normalizes a stored filepath/filename so the frontend can always build
// a clean URL as: BACKEND_URL + "/uploads/" + normalizedFilename
//
// Fixes the bug where MongoDB held Windows-style paths like "uploads\\file.mp4"
// which produced broken URLs such as "/uploads/uploads\\file.mp4" or "/file.mp4".
export function normalizeFilename(rawPath) {
  if (!rawPath) return "";

  let clean = String(rawPath).trim();

  // Replace Windows backslashes with forward slashes
  clean = clean.replace(/\\/g, "/");

  // Strip any leading "uploads/" segments (can appear more than once
  // if it was double-prefixed by older buggy code)
  while (clean.toLowerCase().startsWith("uploads/")) {
    clean = clean.slice("uploads/".length);
  }

  // Strip a leading slash if present
  clean = clean.replace(/^\/+/, "");

  // If the value was a full path (e.g. C:/project/server/uploads/file.mp4),
  // just take the final path segment.
  const segments = clean.split("/");
  clean = segments[segments.length - 1];

  return clean;
}

export function buildUploadsUrl(rawPath) {
  const filename = normalizeFilename(rawPath);
  return `/uploads/${filename}`;
}
