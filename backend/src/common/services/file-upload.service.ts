import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '../logger/custom-logger.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface UploadedFile {
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
    url: string;
}

@Injectable()
export class FileUploadService {
    private readonly uploadDir: string;
    private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
    private readonly allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
        'image/webp',
    ];

    constructor(
        private readonly config: ConfigService,
        private readonly logger: CustomLoggerService,
    ) {
        this.uploadDir = this.config.get('UPLOAD_DIR') || './uploads';
        this.ensureUploadDirExists();
    }

    private async ensureUploadDirExists() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
            this.logger.log(`Created upload directory: ${this.uploadDir}`, 'FileUpload');
        }
    }

    /**
     * Upload a single file
     */
    async uploadFile(
        file: MulterFile,
        subfolder?: string,
    ): Promise<UploadedFile> {
        try {
            // Validate file
            this.validateFile(file);

            // Generate unique filename
            const fileExt = path.extname(file.originalname);
            const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`;

            // Determine upload path
            const uploadPath = subfolder
                ? path.join(this.uploadDir, subfolder)
                : this.uploadDir;

            // Ensure subfolder exists
            await fs.mkdir(uploadPath, { recursive: true });

            // Full file path
            const filePath = path.join(uploadPath, fileName);

            // Write file to disk
            await fs.writeFile(filePath, file.buffer);

            // Generate URL (adjust based on your server setup)
            const baseUrl = this.config.get('BASE_URL') || 'http://localhost:3000';
            const fileUrl = `${baseUrl}/uploads/${subfolder ? subfolder + '/' : ''}${fileName}`;

            const uploadedFile: UploadedFile = {
                filename: fileName,
                originalName: file.originalname,
                path: filePath,
                size: file.size,
                mimetype: file.mimetype,
                url: fileUrl,
            };

            this.logger.logStructured('info', 'File uploaded successfully', {
                context: 'FileUpload',
                filename: fileName,
                size: file.size,
                mimetype: file.mimetype,
            });

            return uploadedFile;
        } catch (error) {
            this.logger.error(
                `File upload failed: ${error.message}`,
                error.stack,
                'FileUpload',
            );
            throw error;
        }
    }

    /**
     * Upload multiple files
     */
    async uploadFiles(
        files: MulterFile[],
        subfolder?: string,
    ): Promise<UploadedFile[]> {
        const uploadPromises = files.map((file) =>
            this.uploadFile(file, subfolder),
        );
        return Promise.all(uploadPromises);
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            this.logger.log(`File deleted: ${filePath}`, 'FileUpload');
        } catch (error) {
            this.logger.error(
                `Failed to delete file: ${filePath}`,
                error.stack,
                'FileUpload',
            );
            throw error;
        }
    }

    /**
     * Validate file
     */
    private validateFile(file: MulterFile): void {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new BadRequestException(
                `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
            );
        }

        // Check mime type
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
            );
        }
    }

    /**
     * Get file info
     */
    async getFileInfo(filePath: string): Promise<any> {
        try {
            const stats = await fs.stat(filePath);
            return {
                exists: true,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
            };
        } catch (error) {
            return { exists: false };
        }
    }
}
