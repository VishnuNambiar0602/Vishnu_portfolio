import * as fs from 'fs/promises';
import * as path from 'path';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class FileValidator {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Validate Python file
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    const existsResult = await this.checkFileExists(filePath);
    if (!existsResult.valid) {
      return existsResult;
    }

    const extensionResult = this.checkFileExtension(filePath);
    if (!extensionResult.valid) {
      return extensionResult;
    }

    const sizeResult = await this.checkFileSize(filePath);
    if (!sizeResult.valid) {
      return sizeResult;
    }

    const readableResult = await this.checkFileReadable(filePath);
    if (!readableResult.valid) {
      return readableResult;
    }

    return { valid: true };
  }

  /**
   * Check if file exists
   */
  private async checkFileExists(filePath: string): Promise<ValidationResult> {
    try {
      await fs.access(filePath);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `File not found: ${filePath}`,
      };
    }
  }

  /**
   * Check file extension
   */
  private checkFileExtension(filePath: string): ValidationResult {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext !== '.py') {
      return {
        valid: false,
        error: `Invalid file type. Expected .py file, got ${ext || 'no extension'}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check file size is within limits
   */
  private async checkFileSize(filePath: string): Promise<ValidationResult> {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.MAX_FILE_SIZE) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        return {
          valid: false,
          error: `File size exceeds 10MB limit (${sizeMB}MB)`,
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: `Failed to check file size: ${error.message}`,
      };
    }
  }

  /**
   * Check file is readable
   */
  private async checkFileReadable(filePath: string): Promise<ValidationResult> {
    try {
      await fs.readFile(filePath, 'utf-8');
      return { valid: true };
    } catch (error: any) {
      if (error.code === 'EACCES') {
        return {
          valid: false,
          error: 'Cannot read file: Permission denied',
        };
      }
      return {
        valid: false,
        error: `Cannot read file: ${error.message}`,
      };
    }
  }

  /**
   * Read file content with error handling
   */
  async readFile(filePath: string): Promise<string> {
    const validation = await this.validateFile(filePath);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
}
