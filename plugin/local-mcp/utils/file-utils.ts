/**
 * File Utilities
 *
 * Handles file reading and chunking for uploading codebases.
 * Properly handles binary files by encoding them as base64.
 */

import * as fs from "fs";
import * as path from "path";

export interface FileContent {
  content: string;
  encoding: "utf-8" | "base64";
}

export interface FileMap {
  [path: string]: string | FileContent;
}

// Binary file extensions that should be base64 encoded
const BINARY_EXTENSIONS = [
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".bmp",
  ".tiff",
  ".avif",
  ".heic",
  ".heif",
  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  // Audio/Video
  ".mp3",
  ".mp4",
  ".webm",
  ".ogg",
  ".wav",
  ".m4a",
  ".flac",
  ".avi",
  ".mov",
  ".mkv",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",
  // Other binary
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
  ".sqlite3",
  ".wasm",
  // Lock files that might be binary
  ".lockb",
];

/**
 * Check if a file should be treated as binary based on extension
 */
export function isBinaryFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

/**
 * Check if content contains binary data (null bytes or high ratio of non-printable chars)
 */
function containsBinaryContent(buffer: Buffer): boolean {
  // Check first 8KB for null bytes or high ratio of non-printable characters
  const sampleSize = Math.min(buffer.length, 8192);
  let nonPrintable = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Null byte is a strong indicator of binary
    if (byte === 0) {
      return true;
    }
    // Count non-printable characters (excluding common whitespace)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintable++;
    }
  }

  // If more than 10% non-printable, treat as binary
  return (nonPrintable / sampleSize) > 0.1;
}

/**
 * Check if a file entry is a FileContent object (binary file)
 */
export function isFileContent(file: string | FileContent): file is FileContent {
  return typeof file === "object" && "encoding" in file;
}

/**
 * Get the content string from a file entry (handles both string and FileContent)
 */
export function getFileContent(file: string | FileContent): string {
  return typeof file === "string" ? file : file.content;
}

/**
 * Get the byte size of a file entry
 */
export function getFileSize(file: string | FileContent): number {
  return getFileContent(file).length;
}

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  // Version control - match .git file (worktrees) or .git directory
  /^\.git$/,
  /(^|\/)\.git\//,
  // Dependencies
  /(^|\/)node_modules\//,
  // Build outputs
  /(^|\/)\.next\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)\.output\//,
  /(^|\/)\.svelte-kit\//,
  // Cache directories
  /(^|\/)\.vercel\//,
  /(^|\/)\.turbo\//,
  /(^|\/)\.cache\//,
  /(^|\/)\.parcel-cache\//,
  /(^|\/)\.vite\//,
  /(^|\/)\.nuxt\//,
  /(^|\/)\.expo\//,
  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  // OS/editor files
  /\.DS_Store$/,
  /\.log$/,
  /Thumbs\.db$/,
  // Coverage
  /(^|\/)coverage\//,
  /(^|\/)\.nyc_output\//,
];

// Env files - excluded for security
const ENV_PATTERNS = [/^\.env/, /\.env\./];

function shouldExclude(filePath: string): boolean {
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return true;
  }
  const fileName = filePath.split('/').pop() || '';
  if (ENV_PATTERNS.some(pattern => pattern.test(fileName))) {
    return true;
  }
  return false;
}

/**
 * Read all project files recursively, properly handling binary files.
 * Binary files are encoded as base64, text files are read as UTF-8.
 * Uses both extension-based and content-based detection for binary files.
 */
export function readProjectFiles(rootDir: string, debug: boolean = false): FileMap {
  const files: FileMap = {};
  let binaryCount = 0;
  let textCount = 0;

  function walkDir(dir: string) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relativePath = path.relative(rootDir, fullPath);

      if (shouldExclude(relativePath)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        try {
          // Always read as buffer first to detect binary content
          const buffer = fs.readFileSync(fullPath);

          // Check if binary by extension OR by content
          const isBinaryByExt = isBinaryFile(entry);
          const isBinaryByContent = !isBinaryByExt && containsBinaryContent(buffer);
          const treatAsBinary = isBinaryByExt || isBinaryByContent;

          if (treatAsBinary) {
            const content = buffer.toString("base64");
            files[relativePath] = { content, encoding: "base64" };
            binaryCount++;
            if (debug && isBinaryByContent && !isBinaryByExt) {
              console.error(`[file-utils] Detected binary by content: ${relativePath}`);
            }
          } else {
            const content = buffer.toString("utf-8");
            files[relativePath] = content;
            textCount++;
          }
        } catch (err) {
          if (debug) {
            console.error(`[file-utils] Failed to read: ${relativePath}`, err);
          }
          // Skip files that can't be read
        }
      }
    }
  }

  walkDir(rootDir);

  if (debug) {
    console.error(`[file-utils] Read ${textCount} text files, ${binaryCount} binary files`);
  }

  return files;
}

// Chunking configuration
// Vercel serverless functions have a 4.5MB request body limit
// We use chunked uploads for anything over 3MB to be safe
export const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk (safe margin under 4.5MB limit)
export const CHUNK_THRESHOLD = 3 * 1024 * 1024; // 3MB - when to switch to chunked mode

/**
 * Calculate total size of all files in bytes
 */
export function calculateTotalSize(files: FileMap): number {
  return Object.values(files).reduce((sum, file) => sum + getFileSize(file), 0);
}

/**
 * Check if chunked upload is needed based on total file size
 */
export function needsChunkedUpload(files: FileMap): boolean {
  return calculateTotalSize(files) > CHUNK_THRESHOLD;
}

/**
 * Split files into chunks that fit within the size limit.
 * Each chunk is a FileMap containing a subset of files.
 *
 * Algorithm:
 * - Sorts files by size (smallest first) for better packing
 * - Greedily adds files to current chunk until size limit reached
 * - Files larger than max chunk size get their own chunk
 */
export function chunkFiles(
  files: FileMap,
  maxChunkSize: number = MAX_CHUNK_SIZE
): FileMap[] {
  const chunks: FileMap[] = [];
  let currentChunk: FileMap = {};
  let currentSize = 0;

  // Sort files by size (smallest first) for better packing
  const entries = Object.entries(files).sort(
    (a, b) => getFileSize(a[1]) - getFileSize(b[1])
  );

  for (const [filePath, file] of entries) {
    const fileSize = getFileSize(file);

    // If this single file is larger than max chunk size, it gets its own chunk
    if (fileSize > maxChunkSize) {
      // Save current chunk if not empty
      if (Object.keys(currentChunk).length > 0) {
        chunks.push(currentChunk);
        currentChunk = {};
        currentSize = 0;
      }
      // Add large file as its own chunk
      chunks.push({ [filePath]: file });
      continue;
    }

    // If adding this file would exceed the limit, start a new chunk
    if (
      currentSize + fileSize > maxChunkSize &&
      Object.keys(currentChunk).length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentSize = 0;
    }

    // Add file to current chunk
    currentChunk[filePath] = file;
    currentSize += fileSize;
  }

  // Don't forget the last chunk
  if (Object.keys(currentChunk).length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Get chunk statistics for logging
 */
export function getChunkStats(chunks: FileMap[]): {
  totalChunks: number;
  chunkSizes: number[];
  totalFiles: number;
  totalSize: number;
} {
  const chunkSizes = chunks.map((chunk) => calculateTotalSize(chunk));
  const totalFiles = chunks.reduce(
    (sum, chunk) => sum + Object.keys(chunk).length,
    0
  );
  const totalSize = chunkSizes.reduce((sum, size) => sum + size, 0);

  return {
    totalChunks: chunks.length,
    chunkSizes,
    totalFiles,
    totalSize,
  };
}

/**
 * Essential config files that should always be included if they exist
 */
const ESSENTIAL_CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.mjs",
  "postcss.config.js",
  "postcss.config.mjs",
  "postcss.config.cjs",
  ".prettierrc",
  ".prettierrc.json",
  ".eslintrc.json",
  "eslint.config.js",
  "index.html",
];

/**
 * Read only specific files from a project directory.
 * Use this after dependency analysis to read only the files that are needed.
 *
 * @param rootDir The root directory of the project
 * @param filePaths Array of relative file paths to read
 * @param includeEssentials Whether to automatically include essential config files
 * @param debug Enable debug logging
 */
export function readSpecificFiles(
  rootDir: string,
  filePaths: string[],
  includeEssentials: boolean = true,
  debug: boolean = false
): FileMap {
  const files: FileMap = {};
  let binaryCount = 0;
  let textCount = 0;
  let notFoundCount = 0;

  // Build a set of paths to read
  const pathsToRead = new Set(filePaths);

  // Add essential config files if requested
  if (includeEssentials) {
    for (const configFile of ESSENTIAL_CONFIG_FILES) {
      const fullPath = path.join(rootDir, configFile);
      if (fs.existsSync(fullPath)) {
        pathsToRead.add(configFile);
      }
    }
  }

  for (const relativePath of pathsToRead) {
    // Skip excluded paths
    if (shouldExclude(relativePath)) {
      if (debug) {
        console.error(`[file-utils] Excluded: ${relativePath}`);
      }
      continue;
    }

    const fullPath = path.join(rootDir, relativePath);

    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) {
        if (debug) {
          console.error(`[file-utils] Not a file: ${relativePath}`);
        }
        continue;
      }

      // Always read as buffer first to detect binary content
      const buffer = fs.readFileSync(fullPath);
      const fileName = path.basename(relativePath);

      // Check if binary by extension OR by content
      const isBinaryByExt = isBinaryFile(fileName);
      const isBinaryByContent = !isBinaryByExt && containsBinaryContent(buffer);
      const treatAsBinary = isBinaryByExt || isBinaryByContent;

      if (treatAsBinary) {
        const content = buffer.toString("base64");
        files[relativePath] = { content, encoding: "base64" };
        binaryCount++;
        if (debug && isBinaryByContent && !isBinaryByExt) {
          console.error(`[file-utils] Detected binary by content: ${relativePath}`);
        }
      } else {
        const content = buffer.toString("utf-8");
        files[relativePath] = content;
        textCount++;
      }
    } catch (err) {
      notFoundCount++;
      if (debug) {
        console.error(`[file-utils] Failed to read: ${relativePath}`, err);
      }
      // Skip files that can't be read
    }
  }

  if (debug) {
    console.error(
      `[file-utils] Read ${textCount} text, ${binaryCount} binary, ${notFoundCount} not found`
    );
  }

  return files;
}
