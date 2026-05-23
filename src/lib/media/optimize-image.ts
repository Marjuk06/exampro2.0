export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  width?: number;
  height?: number;
}

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

/** Resize + WebP when sharp is available; otherwise pass through */
export async function optimizeImageBuffer(
  input: Buffer,
  options?: { maxWidth?: number; quality?: number }
): Promise<OptimizedImage> {
  const maxWidth = options?.maxWidth ?? MAX_WIDTH;
  const quality = options?.quality ?? WEBP_QUALITY;

  try {
    const sharp = (await import("sharp")).default;
    const pipeline = sharp(input).rotate().resize({
      width: maxWidth,
      withoutEnlargement: true,
    });
    const { data, info } = await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      contentType: "image/webp",
      width: info.width,
      height: info.height,
    };
  } catch {
    return { buffer: input, contentType: "application/octet-stream" };
  }
}

export async function createThumbnail(
  input: Buffer,
  size = 320
): Promise<OptimizedImage> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(input)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      contentType: "image/webp",
      width: info.width,
      height: info.height,
    };
  } catch {
    return optimizeImageBuffer(input, { maxWidth: size });
  }
}
