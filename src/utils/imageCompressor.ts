/**
 * High-performance browser-based image compressor using HTML Canvas.
 * Solves mobile camera 12-48MP raw photos (5-15MB) exceeding browser localStorage quota,
 * compressing images to retina-ready, crisp web dimensions (~60-120KB) at high speed.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: string; // 'image/jpeg' or 'image/webp'
}

export function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('檔案不是圖片格式'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取圖片檔案失敗'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('轉換 DataURL 失敗'));
      }
      compressDataUrl(dataUrl, options).then(resolve).catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

export function compressDataUrl(
  dataUrl: string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve) => {
    // SVG data urls don't need raster compression
    if (dataUrl.startsWith('data:image/svg+xml')) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return resolve(dataUrl);
      }

      // Maintain aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(dataUrl);
      }

      // Draw white background for transparent PNG converted to JPEG
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve(compressedBase64);
      } catch (err) {
        console.warn('Canvas export failed, falling back to original dataUrl', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      console.warn('Image load error, falling back to original dataUrl');
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
