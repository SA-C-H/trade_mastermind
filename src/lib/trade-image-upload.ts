import { supabase } from '@/integrations/supabase/client';

export const TRADE_IMAGES_BUCKET = 'trade-images';

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/** Normalize Content-Type for Supabase bucket rules (Windows often sends empty type or image/pjpeg). */
export function normalizeImageContentType(file: File): string {
  const raw = (file.type || '').trim().toLowerCase();
  if (raw === 'image/jpg' || raw === 'image/pjpeg' || raw === 'image/x-png') {
    return 'image/jpeg';
  }
  if (raw && raw.startsWith('image/')) {
    if (raw.includes('heic') || raw.includes('heif')) {
      return 'image/heic-not-allowed';
    }
    return raw;
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export function assertTradeImageFilesAllowed(files: File[]): void {
  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error('UNSUPPORTED_IMAGE');
    }
    const t = (file.type || '').toLowerCase();
    if (t.includes('heic') || t.includes('heif') || ext === 'heic' || ext === 'heif') {
      throw new Error('UNSUPPORTED_IMAGE');
    }
  }
}

export type UploadTradeImagesResult = { urls: string[]; paths: string[] };

export async function uploadTradeImages(
  userId: string,
  tradeId: string,
  phase: 'before' | 'after',
  files: File[]
): Promise<UploadTradeImagesResult> {
  const urls: string[] = [];
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
    const path = `${userId}/${tradeId}/${phase}_${i}.${safeExt}`;
    const contentType = normalizeImageContentType(file);
    if (contentType === 'image/heic-not-allowed') {
      throw new Error('UNSUPPORTED_IMAGE');
    }
    const { error } = await supabase.storage.from(TRADE_IMAGES_BUCKET).upload(path, file, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    paths.push(path);
    const { data } = supabase.storage.from(TRADE_IMAGES_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return { urls, paths };
}
