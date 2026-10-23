import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';

export class ZipPackager {
  /**
   * Create zip archive from scaffold directory
   */
  async createZipArchive(scaffoldDir: string, projectName: string): Promise<string> {
    const buildsDir = path.join(process.cwd(), 'builds');
    await fsPromises.mkdir(buildsDir, { recursive: true });

    const outputPath = path.join(buildsDir, `${projectName}_mlops_scaffold.zip`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => {
        const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
        console.log(`\nZip archive created: ${outputPath}`);
        console.log(`Total size: ${sizeMB} MB`);
        resolve(outputPath);
      });

      output.on('error', (err) => {
        reject(new Error(`Failed to write zip file: ${err.message}`));
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to create archive: ${err.message}`));
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Warning:', err.message);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);
      archive.directory(scaffoldDir, false);
      archive.finalize();
    });
  }

  /**
   * Add individual file to archive
   */
  addFile(archive: any, filePath: string, content: string): void {
    archive.append(content, { name: filePath });
  }

  /**
   * Add directory to archive
   */
  addDirectory(archive: any, dirPath: string): void {
    archive.directory(dirPath, false);
  }

  /**
   * Verify zip archive
   */
  async verifyArchive(zipPath: string): Promise<boolean> {
    try {
      const stats = fs.statSync(zipPath);
      return stats.isFile() && stats.size > 0;
    } catch (error) {
      return false;
    }
  }
}
