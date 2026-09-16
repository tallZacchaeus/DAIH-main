/**
 * Utility to resolve resource image URLs from the API uploads directory,
 * relative static paths, or external URLs.
 */

function getApiHost(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl
      .trim()
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return `${protocol}//${hostname}:4000`;
    }
    return window.location.origin;
  }

  return "http://localhost:4000";
}

export function resolveResourceImageUrl(
  imageUrl?: string | null,
  fallbackCategory?: string,
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

    const apiHost = getApiHost();

    // 2. Relative API upload routes
    if (cleanUrl.startsWith("/uploads/")) {
      return `${apiHost}${cleanUrl}`;
    }

    if (cleanUrl.startsWith("uploads/")) {
      return `${apiHost}/${cleanUrl}`;
    }

    // 3. Local built-in /images/ presets
    if (cleanUrl.startsWith("/images/")) {
      return cleanUrl;
    }

    // 4. Filename only (e.g. "meeting-room-123.webp")
    if (!cleanUrl.startsWith("/")) {
      return `${apiHost}/uploads/resources/${cleanUrl}`;
    }

    return cleanUrl;
  }

  // Fallbacks by category or slug
  const cat = (fallbackCategory || "").toUpperCase();
  const slug = (fallbackSlug || "").toLowerCase();

  if (
    cat === "STUDIO" ||
    slug.includes("studio") ||
    slug.includes("stream") ||
    slug.includes("podcast")
  ) {
    return "/images/search/4.jpg";
  }
  if (
    cat === "ROOFTOP_LOUNGE" ||
    slug.includes("rooftop") ||
    slug.includes("terrace")
  ) {
    return "/images/search/6.jpg";
  }
  if (
    cat === "TRAINING_ROOM" ||
    slug.includes("training") ||
    slug.includes("meeting") ||
    slug.includes("conference")
  ) {
    return "/images/search/5.jpg";
  }
  if (
    cat === "OFFICE_SUITE" ||
    slug.includes("office") ||
    slug.includes("private") ||
    slug.includes("suite")
  ) {
    return "/images/search/3.jpg";
  }
  if (
    cat === "DEDICATED_DESK" ||
    slug.includes("dedicated") ||
    slug.includes("workstation")
  ) {
    return "/images/search/1.jpg";
  }

  return "/images/search/2.jpg";
}

export function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl || !avatarUrl.trim()) return null;
  const cleanUrl = avatarUrl.trim();
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:")
  ) {
    return cleanUrl;
  }
  const apiHost = getApiHost();
  if (cleanUrl.startsWith("/uploads/")) {
    return `${apiHost}${cleanUrl}`;
  }
  if (cleanUrl.startsWith("uploads/")) {
    return `${apiHost}/${cleanUrl}`;
  }
  if (!cleanUrl.startsWith("/")) {
    return `${apiHost}/uploads/avatars/${cleanUrl}`;
  }
  return `${apiHost}${cleanUrl}`;
}
