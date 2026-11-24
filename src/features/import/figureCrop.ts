// ==============================================================================
// V-ACT HUB: Figure Cropping & Storage Service (PDF / Image -> Canvas -> Supabase/Local)
// ==============================================================================

import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { LOCAL_USER_ID } from '../../data/localRepository';

export type BoundingBox = [number, number, number, number]; // [x0, y0, x1, y1] (0.0 to 1.0)

export interface CropArea {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0..1
  height: number; // 0..1
}

export interface FigureCropResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export function clamp(val: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Normalizes [x0, y0, x1, y1] to valid crop area { x, y, width, height } in 0..1 range
 */
export function bboxToCropArea(bbox?: BoundingBox | null): CropArea {
  if (!bbox || bbox.length !== 4) {
    return { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
  }
  const [rawX0, rawY0, rawX1, rawY1] = bbox;
  const x0 = clamp(Math.min(rawX0, rawX1));
  const y0 = clamp(Math.min(rawY0, rawY1));
  const x1 = clamp(Math.max(rawX0, rawX1));
  const y1 = clamp(Math.max(rawY0, rawY1));

  return {
    x: x0,
    y: y0,
    width: Math.max(0.01, x1 - x0),
    height: Math.max(0.01, y1 - y0),
  };
}

export function cropAreaToBbox(area: CropArea): BoundingBox {
  const x0 = clamp(area.x);
  const y0 = clamp(area.y);
  const x1 = clamp(area.x + area.width);
  const y1 = clamp(area.y + area.height);
  return [x0, y0, x1, y1];
}

/**
 * Cuts a sub-region from an HTMLCanvasElement or HTMLImageElement
 * using normalized coordinates bbox [x0, y0, x1, y1].
 */
export function cropCanvasRegion(
  source: HTMLCanvasElement | HTMLImageElement,
  bbox: BoundingBox
): Promise<FigureCropResult> {
  return new Promise((resolve, reject) => {
    try {
      const sourceWidth = (source as HTMLCanvasElement).width || (source as HTMLImageElement).naturalWidth;
      const sourceHeight = (source as HTMLCanvasElement).height || (source as HTMLImageElement).naturalHeight;

      if (!sourceWidth || !sourceHeight) {
        throw new Error('Hình ảnh nguồn chưa được tải hoặc kích thước bằng 0.');
      }

      const area = bboxToCropArea(bbox);
      const sx = Math.round(area.x * sourceWidth);
      const sy = Math.round(area.y * sourceHeight);
      const sWidth = Math.max(1, Math.round(area.width * sourceWidth));
      const sHeight = Math.max(1, Math.round(area.height * sourceHeight));

      const offscreen = document.createElement('canvas');
      offscreen.width = sWidth;
      offscreen.height = sHeight;

      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        throw new Error('Không thể khởi tạo Canvas 2D Context.');
      }

      ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const dataUrl = offscreen.toDataURL('image/png');
      offscreen.toBlob((blob) => {
        if (!blob) {
          // Fallback to dataUrl conversion if toBlob fails
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const fbBlob = new Blob([ab], { type: mimeString });
          resolve({ dataUrl, blob: fbBlob, width: sWidth, height: sHeight });
          return;
        }
        resolve({ dataUrl, blob, width: sWidth, height: sHeight });
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts a data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Saves cropped figure to Supabase Storage bucket 'figures' (if user_id present and Supabase active)
 * or returns base64 Data URL for Offline / Local IndexedDB storage.
 */
export async function saveFigure(
  fileOrBlobOrDataUrl: Blob | string,
  options?: {
    userId?: string;
    customName?: string;
  }
): Promise<string> {
  const isDataUrl = typeof fileOrBlobOrDataUrl === 'string' && fileOrBlobOrDataUrl.startsWith('data:');
  const isHttpUrl = typeof fileOrBlobOrDataUrl === 'string' && fileOrBlobOrDataUrl.startsWith('http');

  if (isHttpUrl) {
    return fileOrBlobOrDataUrl;
  }

  const userId = options?.userId || LOCAL_USER_ID;
  const canUploadToSupabase =
    isSupabaseConfigured &&
    supabase !== null &&
    userId !== LOCAL_USER_ID &&
    userId.length > 5;

  if (canUploadToSupabase && supabase) {
    const client = supabase;
    try {
      const blob = isDataUrl
        ? dataUrlToBlob(fileOrBlobOrDataUrl)
        : (fileOrBlobOrDataUrl as Blob);

      const fileExt = 'png';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await client.storage
        .from('figures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = client.storage
          .from('figures')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Supabase figure upload failed, falling back to local dataUrl:', e);
    }
  }

  // Local mode fallback: return data URL
  if (isDataUrl) {
    return fileOrBlobOrDataUrl;
  }

  // Convert Blob to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlobOrDataUrl as Blob);
  });
}

/**
 * Dynamically loads PDF.js script from CDN if not already loaded in the environment
 */
let pdfjsPromise: Promise<any> | null = null;

export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('PDF.js library loaded but pdfjsLib is undefined'));
      }
    };
    script.onerror = () => reject(new Error('Không thể tải PDF.js từ CDN'));
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

/**
 * Renders a specific page of a PDF document to an HTMLCanvasElement
 */
export async function renderPdfPageToCanvas(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number; numPages: number }> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    throw new Error('PDF.js không khả dụng');
  }

  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const validPageNum = Math.max(1, Math.min(numPages, pageNumber));
  const page = await pdfDoc.getPage(validPageNum);

  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được 2D context của canvas');

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
    numPages,
  };
}
