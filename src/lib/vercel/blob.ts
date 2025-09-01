/**
 * Vercel Blob Storage Integration
 * Secure file upload and management
 */

import { put, del, list, head } from '@vercel/blob';
import { env } from '@/lib/env';

export interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  contentType?: string;
}

export interface UploadOptions {
  access?: 'public' | 'private';
  addRandomSuffix?: boolean;
  cacheControlMaxAge?: number;
  contentType?: string;
}

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

/**
 * Vercel Blob Client
 */
export class VercelBlobClient {
  private token: string;

  constructor(token?: string) {
    this.token = token ?? env.VERCEL_BLOB_READ_WRITE_TOKEN;
  }

  /**
   * Upload file from buffer or string
   */
  async uploadFile(
    filename: string,
    data: Buffer | string | Uint8Array,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const result = await put(filename, data, {
        access: options.access ?? 'public',
        addRandomSuffix: options.addRandomSuffix ?? true,
        token: this.token,
        ...(options.cacheControlMaxAge && {
          cacheControlMaxAge: options.cacheControlMaxAge,
        }),
        ...(options.contentType && {
          contentType: options.contentType,
        }),
      });

      return {
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType,
        contentDisposition: result.contentDisposition,
      };
    } catch (error) {
      console.error('[Vercel Blob] Upload error:', error);
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload file from FormData (for API routes)
   */
  async uploadFromFormData(
    formData: FormData,
    fieldName = 'file',
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const file = formData.get(fieldName) as File;
    if (!file) {
      throw new Error(`No file found in form data field: ${fieldName}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return this.uploadFile(file.name, buffer, {
      ...options,
      contentType: options.contentType ?? file.type,
    });
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{
      filename: string;
      data: Buffer | string | Uint8Array;
      options?: UploadOptions;
    }>
  ): Promise<UploadResult[]> {
    const uploads = files.map(({ filename, data, options = {} }) =>
      this.uploadFile(filename, data, options)
    );

    try {
      return await Promise.all(uploads);
    } catch (error) {
      console.error('[Vercel Blob] Multiple upload error:', error);
      throw new Error(
        `Failed to upload multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete file by URL
   */
  async deleteFile(url: string): Promise<void> {
    try {
      await del(url, { token: this.token });
    } catch (error) {
      console.error('[Vercel Blob] Delete error:', error);
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(urls: string[]): Promise<void> {
    const deletions = urls.map(url => this.deleteFile(url));

    try {
      await Promise.all(deletions);
    } catch (error) {
      console.error('[Vercel Blob] Multiple delete error:', error);
      throw new Error(
        `Failed to delete multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List files with optional prefix filtering
   */
  async listFiles(
    options: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{
    blobs: BlobFile[];
    hasMore: boolean;
    cursor?: string;
  }> {
    try {
      const result = await list({
        prefix: options.prefix,
        limit: options.limit,
        cursor: options.cursor,
        token: this.token,
      });

      return {
        blobs: result.blobs.map(blob => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
          contentType: blob.contentType,
        })),
        hasMore: result.hasMore,
        cursor: result.cursor,
      };
    } catch (error) {
      console.error('[Vercel Blob] List error:', error);
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(url: string): Promise<{
    contentType: string;
    contentLength: number;
    lastModified?: string;
    etag?: string;
  }> {
    try {
      const result = await head(url, { token: this.token });

      return {
        contentType: result.contentType,
        contentLength: result.contentLength,
        lastModified: result.lastModified,
        etag: result.etag,
      };
    } catch (error) {
      console.error('[Vercel Blob] Head error:', error);
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate upload URL for client-side uploads
   */
  generateUploadUrl(filename: string, options: UploadOptions = {}): string {
    const params = new URLSearchParams({
      filename,
      ...(options.access && { access: options.access }),
      ...(options.addRandomSuffix !== undefined && {
        addRandomSuffix: options.addRandomSuffix.toString(),
      }),
      ...(options.cacheControlMaxAge && {
        cacheControlMaxAge: options.cacheControlMaxAge.toString(),
      }),
      ...(options.contentType && { contentType: options.contentType }),
    });

    return `/api/upload/blob?${params.toString()}`;
  }

  /**
   * Validate file type
   */
  static validateFileType(
    file: File | string,
    allowedTypes: string[]
  ): boolean {
    const fileType =
      typeof file === 'string' ? file : file.type || 'application/octet-stream';

    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.slice(0, -1));
      }
      return fileType === type;
    });
  }

  /**
   * Validate file size
   */
  static validateFileSize(
    file: File | Buffer | string,
    maxSizeBytes: number
  ): boolean {
    let size: number;

    if (file instanceof File) {
      size = file.size;
    } else if (file instanceof Buffer) {
      size = file.length;
    } else {
      size = new TextEncoder().encode(file).length;
    }

    return size <= maxSizeBytes;
  }

  /**
   * Generate safe filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[^\w\-_\. ]/g, '') // Keep only word chars, hyphens, underscores, dots, spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Get file extension from filename or URL
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  /**
   * Generate unique filename with timestamp
   */
  static generateUniqueFilename(originalFilename: string): string {
    const extension = this.getFileExtension(originalFilename);
    const baseName = originalFilename
      .replace(`.${extension}`, '')
      .replace(/[^\w\-_]/g, '_');

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${baseName}_${timestamp}_${random}.${extension}`;
  }
}

// Singleton instance
let clientInstance: VercelBlobClient | null = null;

/**
 * Get Vercel Blob client instance
 */
export function getVercelBlobClient(): VercelBlobClient {
  if (!clientInstance) {
    clientInstance = new VercelBlobClient();
  }
  return clientInstance;
}

// File type constants
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const ALLOWED_ALL_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// File size constants (in bytes)
export const MAX_FILE_SIZE_1MB = 1 * 1024 * 1024;
export const MAX_FILE_SIZE_5MB = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_10MB = 10 * 1024 * 1024;
