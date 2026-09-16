/**
 * Client-Side Image Compression & Optimization Utility
 *
 * Provides client-side resizing and WebP/JPEG compression before transmission,
 * ensuring fast uploads and reducing bandwidth consumption.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
}

export interface CompressedImageResult {
  data: string; // Base64 data (without data: prefix or full data URI)
  dataUrl: string; // Full data URI for <img> preview
  fileName: string;
  contentType: string;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  width: number;
  height: number;
  savingsPercentage: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    mimeType = "image/webp",
  } = options;

  const originalSize = file.size;
  const rawFileName = file.name;

  // SVG files are vector - do not rasterize via canvas
  if (file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        resolve({
          data: base64,
          dataUrl,
          fileName: rawFileName,
          contentType: "image/svg+xml",
          originalSize,
          compressedSize: originalSize,
          width: 0,
          height: 0,
          savingsPercentage: 0,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale if dimensions exceed max constraints
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create 2D canvas rendering context"));
          return;
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to selected format (WebP with fallback)
        let targetMimeType = mimeType;
        let dataUrl = canvas.toDataURL(targetMimeType, quality);

        // Fallback to JPEG if browser doesn't support WebP export
        if (
          targetMimeType === "image/webp" &&
          !dataUrl.startsWith("data:image/webp")
        ) {
          targetMimeType = "image/jpeg";
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Calculate compressed size from base64 string
        const base64Data = dataUrl.split(",")[1];
        const compressedBytes = Math.round((base64Data.length * 3) / 4);
        const savings = Math.max(
          0,
          Math.round(((originalSize - compressedBytes) / originalSize) * 100),
        );

        const newExt = targetMimeType === "image/webp" ? "webp" : "jpg";
        const cleanName = rawFileName.replace(/\.[^/.]+$/, "") + `.${newExt}`;

        resolve({
          data: base64Data,
          dataUrl,
          fileName: cleanName,
          contentType: targetMimeType,
          originalSize,
          compressedSize: compressedBytes,
          width,
          height,
          savingsPercentage: savings,
        });
      };

      img.onerror = () => {
        reject(new Error("Failed to load and process image file"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable string (e.g. 1.2 MB or 340 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
