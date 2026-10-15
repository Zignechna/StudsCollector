const RB_MEDIA = "https://cdn.rebrickable.com/media/";

/** Shortens Rebrickable CDN URLs for storage. */
export function compactImg(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith(RB_MEDIA) ? url.slice(RB_MEDIA.length) : url;
}

/** Expands a stored image path back into a full URL. */
export function expandImg(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : RB_MEDIA + path;
}
