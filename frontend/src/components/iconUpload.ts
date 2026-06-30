// Read an image File, downscale to <= `max`px on the long edge, and return a PNG
// data URL — small enough to live in the app's icon field. Re-encoding through a
// canvas also rasterizes/sanitizes the image. Falls back to the raw data URL
// (safe inside an <img>) if canvas processing fails.
export async function fileToIconDataUrl(file: File, max = 128): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('decode failed'));
      i.src = raw;
    });
    const longEdge = Math.max(img.width || max, img.height || max);
    const scale = Math.min(1, max / longEdge);
    const w = Math.max(1, Math.round((img.width || max) * scale));
    const h = Math.max(1, Math.round((img.height || max) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return raw;
  }
}
