import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secure directories outside public static serving
export const SECURE_IDENTITY_DIR = path.resolve(__dirname, '..', 'secure_uploads', 'identity');
export const SECURE_OWNERSHIP_DIR = path.resolve(__dirname, '..', 'secure_uploads', 'ownership');

// Ensure directories exist
if (!fs.existsSync(SECURE_IDENTITY_DIR)) {
  fs.mkdirSync(SECURE_IDENTITY_DIR, { recursive: true });
}
if (!fs.existsSync(SECURE_OWNERSHIP_DIR)) {
  fs.mkdirSync(SECURE_OWNERSHIP_DIR, { recursive: true });
}

// Allowed extensions and MIME types
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Validates binary file signatures (magic bytes) to prevent extension spoofing.
 * @param {string} filePath - Absolute path to the file on disk.
 * @returns {boolean} - True if signature matches allowed PDF, JPG, or PNG signatures.
 */
export function validateFileMagicBytes(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    // JPEG magic bytes: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
                  buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

    return isPdf || isJpeg || isPng;
  } catch (err) {
    console.error('Magic bytes inspection error:', err);
    return false;
  }
}

/**
 * Secure file filter for Multer (Extension and MIME check)
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(mime)) {
    return cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
  }
  cb(null, true);
}

/**
 * Multer storage for Identity Documents (randomized filenames)
 */
const identityStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SECURE_IDENTITY_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomizedName = `id-${crypto.randomUUID()}${ext}`;
    cb(null, randomizedName);
  }
});

export const uploadIdentity = multer({
  storage: identityStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit for identity documents
  },
  fileFilter: fileFilter
});

/**
 * Multer storage for Property Ownership Documents (randomized filenames)
 */
const ownershipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SECURE_OWNERSHIP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomizedName = `prop-${crypto.randomUUID()}${ext}`;
    cb(null, randomizedName);
  }
});

export const uploadOwnership = multer({
  storage: ownershipStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit for ownership documents
  },
  fileFilter: fileFilter
});

/**
 * Safe path resolver to prevent directory traversal attacks
 * @param {string} baseDir - Target secure directory
 * @param {string} rawFilename - Filename from DB or request
 * @returns {string|null} - Verified absolute path, or null if traversal attempt or not found
 */
export function getSafeFilePath(baseDir, rawFilename) {
  if (!rawFilename) return null;
  const safeFilename = path.basename(rawFilename);
  const resolvedPath = path.resolve(baseDir, safeFilename);
  const resolvedBase = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBase)) {
    return null; // Traversal attempted!
  }

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return resolvedPath;
}
