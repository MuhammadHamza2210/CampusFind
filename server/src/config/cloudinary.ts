import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { env } from './env';

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Uploads an image buffer. Uses Cloudinary when configured, otherwise
 * writes to local /uploads and returns a locally-served URL.
 */
export async function uploadImage(
  buffer: Buffer,
  originalName: string
): Promise<UploadedImage> {
  if (env.cloudinary.enabled) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'campusfind', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  }

  // Local disk fallback
  ensureUploadDir();
  const ext = (path.extname(originalName) || '.jpg').toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  await fs.promises.writeFile(filePath, buffer);
  return { url: `/uploads/${name}`, publicId: `local:${name}` };
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;
  if (publicId.startsWith('local:')) {
    const name = publicId.slice('local:'.length);
    const filePath = path.join(UPLOAD_DIR, name);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      /* ignore */
    }
    return;
  }
  if (env.cloudinary.enabled) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      /* ignore */
    }
  }
}

export { UPLOAD_DIR };
