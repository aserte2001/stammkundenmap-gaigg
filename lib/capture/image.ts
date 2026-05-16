/**
 * Browser-side image compression. Marble accepts JPG/PNG/WebP up to 100 MB
 * each (verified Phase 0), but a phone's raw camera capture is typically
 * 4–10 MB and a full set of 8 photos quickly bloats the upload. We rescale to
 * a max edge of 2048 px and re-encode at JPEG q=0.85 — that lands every photo
 * around 600 KB while preserving more than enough detail for splat fitting.
 */
export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
  /** Output mime type. Marble doesn't care; JPEG gives the smallest size. */
  type?: "image/jpeg" | "image/webp" | "image/png";
};

const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 2048,
  quality: 0.85,
  type: "image/jpeg",
};

export async function compressImage(blob: Blob, opts: CompressOptions = {}): Promise<Blob> {
  const { maxEdge, quality, type } = { ...DEFAULTS, ...opts };
  const bitmap = await loadBitmap(blob);
  try {
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, maxEdge);
    if (width === bitmap.width && height === bitmap.height && type === blob.type) {
      // Image already small enough and same encoding — return as-is.
      return blob;
    }
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("compressImage: 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await canvasToBlob(canvas, type, quality);
  } finally {
    if ("close" in bitmap) bitmap.close();
  }
}

export function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // fall through to HTMLImageElement path
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return await canvas.convertToBlob({ type, quality });
  }
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      type,
      quality,
    );
  });
}
