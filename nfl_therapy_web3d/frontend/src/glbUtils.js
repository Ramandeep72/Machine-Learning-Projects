/** Vite base-aware URL for files in `public/` */
export function publicAssetUrl(relativePath) {
  const base = import.meta.env.BASE_URL || "/";
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return trimmedBase ? `${trimmedBase}${path}` : path;
}

/** Binary GLB starts with ASCII "glTF" (not HTML / JSON error pages). */
export function isBinaryGlbHeader(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const u8 = new Uint8Array(buffer);
  const sig = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  return sig === "glTF";
}

/**
 * True if URL returns a real binary GLB (first bytes are glTF magic).
 * Uses Range when the server supports it (only first bytes fetched).
 */
export async function urlLooksLikeBinaryGlb(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-15" }
    });
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    return isBinaryGlbHeader(buf.slice(0, 4));
  } catch {
    return false;
  }
}
