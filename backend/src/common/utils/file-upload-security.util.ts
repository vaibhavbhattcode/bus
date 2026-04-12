import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * File Upload Security Utility
 * Provides secure file upload validation and handling
 */

// Allowed MIME types with their magic number signatures
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': { ext: ['.jpg', '.jpeg'], magic: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'] },
  'image/png': { ext: ['.png'], magic: ['89504e47'] },
  'image/webp': { ext: ['.webp'], magic: ['52494646'] },
  
  // Documents
  'application/pdf': { ext: ['.pdf'], magic: ['25504446'] },
  
  // Archives (for bulk uploads)
  'application/zip': { ext: ['.zip'], magic: ['504b0304', '504b0506', '504b0708'] },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILENAME_LENGTH = 255;

export class FileUploadSecurity {
  /**
   * Validates file upload security
   * @param file - Uploaded file buffer
   * @param originalName - Original filename
   * @param mimeType - Declared MIME type
   * @returns Validated file info
   */
  static validateFile(file: Buffer, originalName: string, mimeType: string): {
    isValid: boolean;
    sanitizedName: string;
    detectedType: string;
  } {
    // 1. Check file size
    if (file.length > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // 2. Validate filename
    if (originalName.length > MAX_FILENAME_LENGTH) {
      throw new BadRequestException('Filename too long');
    }

    // 3. Sanitize filename
    const sanitizedName = this.sanitizeFilename(originalName);

    // 4. Validate MIME type
    if (!ALLOWED_FILE_TYPES[mimeType]) {
      throw new BadRequestException(`File type ${mimeType} not allowed`);
    }

    // 5. Verify magic number (file signature)
    const detectedType = this.detectFileType(file);
    if (detectedType !== mimeType) {
      throw new BadRequestException('File type mismatch - file may be corrupted or malicious');
    }

    // 6. Check file extension
    const ext = path.extname(sanitizedName).toLowerCase();
    const allowedExts = ALLOWED_FILE_TYPES[mimeType].ext;
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(`File extension ${ext} not allowed for type ${mimeType}`);
    }

    return {
      isValid: true,
      sanitizedName,
      detectedType,
    };
  }

  /**
   * Generates a secure random filename
   * @param originalName - Original filename
   * @returns Secure filename with original extension
   */
  static generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${randomName}${ext}`;
  }

  /**
   * Sanitizes filename by removing dangerous characters
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = path.basename(filename);
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
    
    // Limit length
    if (sanitized.length > MAX_FILENAME_LENGTH) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    }
    
    return sanitized || 'unnamed';
  }

  /**
   * Detects file type by reading magic number (file signature)
   * @param file - File buffer
   * @returns Detected MIME type or null
   */
  private static detectFileType(file: Buffer): string | null {
    if (file.length < 4) {
      return null;
    }

    // Read first 4 bytes as hex
    const header = file.slice(0, 4).toString('hex');

    // Check against known signatures
    for (const [mimeType, config] of Object.entries(ALLOWED_FILE_TYPES)) {
      for (const magic of config.magic) {
        if (header.startsWith(magic)) {
          return mimeType;
        }
      }
    }

    return null;
  }

  /**
   * Validates image dimensions (prevents zip bombs)
   * @param file - Image buffer
   * @param maxWidth - Maximum width
   * @param maxHeight - Maximum height
   */
  static validateImageDimensions(
    file: Buffer,
    maxWidth: number = 4096,
    maxHeight: number = 4096,
  ): void {
    // This is a basic check - in production, use a library like 'sharp' or 'jimp'
    // to properly validate image dimensions
    const type = this.detectFileType(file);
    
    if (type?.startsWith('image/')) {
      // For now, just check file size as a proxy
      // In production, decode the image and check actual dimensions
      if (file.length > 10 * 1024 * 1024) { // 10MB
        throw new BadRequestException('Image file too large');
      }
    }
  }

  /**
   * Gets safe storage path (outside web root)
   * @param filename - Filename
   * @returns Safe storage path
   */
  static getStoragePath(filename: string): string {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const secureFilename = this.generateSecureFilename(filename);
    
    // Organize by date for easier management
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return path.join(uploadDir, String(year), month, secureFilename);
  }
}

/**
 * Example usage in a controller:
 * 
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * async uploadFile(@UploadedFile() file: Express.Multer.File) {
 *   const validation = FileUploadSecurity.validateFile(
 *     file.buffer,
 *     file.originalname,
 *     file.mimetype
 *   );
 *   
 *   const storagePath = FileUploadSecurity.getStoragePath(file.originalname);
 *   // Save file to storagePath
 *   
 *   return { filename: validation.sanitizedName, path: storagePath };
 * }
 */
