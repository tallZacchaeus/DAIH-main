/**
 * Utility to resolve resource image URLs from the API uploads directory,
 * relative static paths, or external URLs for the public web application.
 */
export function resolveResourceImageUrl(
  imageUrl?: string | null,
  fallbackSlug?: string,
): string {
  if (imageUrl && imageUrl.trim()) {
    const cleanUrl = imageUrl.trim();

    // 1. External absolute URLs
    if (
      cleanUrl.startsWith("http://") ||
      cleanUrl.startsWith("https://") ||
      cleanUrl.startsWith("data:")
    ) {
      return cleanUrl;
    }

    // 2. Relative API upload routes
    if (cleanUrl.startsWith("/uploads/")) {
      const apiHost =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      return `${apiHost}${cleanUrl}`;
    }

    if (cleanUrl.startsWith("uploads/")) {
      const apiHost =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      return `${apiHost}/${cleanUrl}`;
    }

    // 3. Local built-in /images/ presets
    if (cleanUrl.startsWith("/images/")) {
      return cleanUrl;
    }

    // 4. Filename only (e.g. "meeting-room-123.webp")
    if (!cleanUrl.startsWith("/")) {
      const apiHost =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      return `${apiHost}/uploads/resources/${cleanUrl}`;
    }

    return cleanUrl;
  }

  // Fallbacks by slug
  const s = (fallbackSlug || "").toLowerCase();
  if (
    s.includes("studio") ||
    s.includes("audio") ||
    s.includes("stream") ||
    s.includes("podcast")
  ) {
    return "/images/search/4.jpg";
  }
  if (s.includes("rooftop") || s.includes("terrace")) {
    return "/images/search/6.jpg";
  }
  if (
    s.includes("training") ||
    s.includes("meeting") ||
    s.includes("conference")
  ) {
    return "/images/search/5.jpg";
  }
  if (s.includes("office") || s.includes("private") || s.includes("suite")) {
    return "/images/search/3.jpg";
  }
  if (s.includes("dedicated") || s.includes("workstation")) {
    return "/images/search/1.jpg";
  }

  return "/images/search/2.jpg";
}

export const getWorkspaceImage = (
  slug?: string | null,
  imageUrl?: string | null,
): string => {
  return resolveResourceImageUrl(imageUrl, slug || undefined);
};
