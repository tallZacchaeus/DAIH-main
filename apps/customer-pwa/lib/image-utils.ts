/**
 * Utility to resolve resource image URLs from the API uploads directory,
 * relative static paths, or external URLs for the customer PWA application.
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

  // Fallbacks by slug
  const s = (fallbackSlug || "").toLowerCase();
  if (s.includes("stream")) return "/images/misc/space-type-streaming.jpg";
  if (s.includes("podcast") || s.includes("audio"))
    return "/images/misc/space-type-podcast.jpg";
  if (s.includes("photo")) return "/images/misc/space-type-photo.jpg";
  if (s.includes("studio")) return "/images/search/4.jpg";
  if (s.includes("rooftop") || s.includes("terrace"))
    return "/images/search/6.jpg";
  if (
    s.includes("training") ||
    s.includes("meeting") ||
    s.includes("conference")
  )
    return "/images/search/5.jpg";
  if (s.includes("office") || s.includes("private") || s.includes("suite"))
    return "/images/search/3.jpg";
  if (s.includes("dedicated") || s.includes("workstation"))
    return "/images/search/1.jpg";

  return "/images/search/2.jpg";
}

export const getWorkspaceImage = (slug: string, imageUrl?: string | null) =>
  resolveResourceImageUrl(imageUrl, slug);

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
