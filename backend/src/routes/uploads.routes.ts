import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'uploads');

const uploadImageSchema = z.object({
  path: z.string().optional(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  data: z.string().min(1),
});

const deleteImagesSchema = z.object({
  paths: z.array(z.string().min(1)).min(1),
});

function sanitizeUploadPath(input: string) {
  const normalized = input
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^api\/v1\/uploads\//, '')
    .replace(/^uploads\//, '');

  if (!normalized) {
    return null;
  }

  const safePath = path.posix.normalize(normalized);
  if (
    safePath === '.' ||
    safePath === '..' ||
    safePath.startsWith('../') ||
    safePath.includes('\0')
  ) {
    return null;
  }

  return safePath.replace(/^\/+/, '');
}

function resolveUploadAbsolutePath(relativePath: string) {
  const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);
  const safeRoot = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(safeRoot)) {
    return null;
  }

  return absolutePath;
}

export const uploadsRouter = Router();

uploadsRouter.post(
  '/images',
  requireAuth,
  requireRole('admin', 'organizer'),
  async (req, res, next) => {
    try {
      const parsed = uploadImageSchema.parse(req.body);

      if (!ALLOWED_MIME_TYPES.has(parsed.contentType)) {
        res.status(400).json({ success: false, message: 'Unsupported image type' });
        return;
      }

      const extension = path.extname(parsed.fileName).replace('.', '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        res.status(400).json({ success: false, message: 'Unsupported file extension' });
        return;
      }

      const base64Data = parsed.data.includes(',') ? parsed.data.split(',').pop() || '' : parsed.data;
      const buffer = Buffer.from(base64Data, 'base64');

      if (!buffer.length) {
        res.status(400).json({ success: false, message: 'Image payload is empty' });
        return;
      }

      if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
        res.status(400).json({ success: false, message: 'Image exceeds 5MB limit' });
        return;
      }

      const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension === 'jpeg' ? 'jpg' : extension}`;
      const relativePath = path.posix.join('events', fileName);
      const absolutePath = resolveUploadAbsolutePath(relativePath);

      if (!absolutePath) {
        res.status(400).json({ success: false, message: 'Invalid upload path' });
        return;
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, buffer);

      res.status(201).json({
        success: true,
        path: relativePath,
        publicUrl: `/api/v1/uploads/${relativePath}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

uploadsRouter.delete(
  '/images',
  requireAuth,
  requireRole('admin', 'organizer'),
  async (req, res, next) => {
    try {
      const parsed = deleteImagesSchema.parse(req.body);
      const deletedPaths: string[] = [];

      for (const inputPath of parsed.paths) {
        const relativePath = sanitizeUploadPath(inputPath);
        if (!relativePath) {
          continue;
        }

        const absolutePath = resolveUploadAbsolutePath(relativePath);
        if (!absolutePath) {
          continue;
        }

        try {
          await fs.unlink(absolutePath);
          deletedPaths.push(relativePath);
        } catch (error: any) {
          if (error?.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      res.json({ success: true, deletedPaths });
    } catch (error) {
      next(error);
    }
  }
);
