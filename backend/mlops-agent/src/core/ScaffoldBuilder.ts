import * as fs from 'fs/promises';
import * as path from 'path';
import { GeneratedFile } from './StateManager.js';

export interface ScaffoldStructure {
  rootDir: string;
  directories: {
    github: string;
    docs: string;
    tests: string;
    src: string;
  };
}

export class ScaffoldBuilder {
  private rootDir: string;

  constructor(projectName: string = 'mlops-project', baseDir?: string) {
    const buildDir = baseDir || path.join(process.cwd(), 'builds');
    this.rootDir = path.join(buildDir, `${projectName}_scaffold`);
  }

  /**
   * Create scaffold structure
   */
  async createStructure(): Promise<ScaffoldStructure> {
    const structure: ScaffoldStructure = {
      rootDir: this.rootDir,
      directories: {
        github: path.join(this.rootDir, '.github', 'workflows'),
        docs: path.join(this.rootDir, 'docs'),
        tests: path.join(this.rootDir, 'tests'),
        src: path.join(this.rootDir, 'src'),
      },
    };

    await fs.mkdir(structure.rootDir, { recursive: true });
    await fs.mkdir(structure.directories.github, { recursive: true });
    await fs.mkdir(structure.directories.docs, { recursive: true });
    await fs.mkdir(structure.directories.tests, { recursive: true });
    await fs.mkdir(structure.directories.src, { recursive: true });

    console.log(`Created scaffold structure at: ${this.rootDir}`);

    return structure;
  }

  /**
   * Place generated files in directories
   */
  async placeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const filePath = this.resolveFilePath(file.path);
      const dir = path.dirname(filePath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
      console.log(`Created: ${file.path}`);
    }
  }

  /**
   * Copy input file to scaffold
   */
  async copyInputFile(inputFilePath: string): Promise<void> {
    const fileName = path.basename(inputFilePath);
    const destPath = path.join(this.rootDir, 'src', fileName);

    await fs.copyFile(inputFilePath, destPath);
    console.log(`Copied input file to: src/${fileName}`);
  }

  /**
   * Generate .gitignore file
   */
  generateGitignore(): string {
    const patterns = [
      '# Python',
      '__pycache__/',
      '*.py[cod]',
      '*$py.class',
      '*.so',
      '.Python',
      'build/',
      'develop-eggs/',
      'dist/',
      'downloads/',
      'eggs/',
      '.eggs/',
      'lib/',
      'lib64/',
      'parts/',
      'sdist/',
      'var/',
      'wheels/',
      'pip-wheel-metadata/',
      'share/python-wheels/',
      '*.egg-info/',
      '.installed.cfg',
      '*.egg',
      'MANIFEST',
      '',
      '# Virtual environments',
      'venv/',
      'env/',
      'ENV/',
      'env.bak/',
      'venv.bak/',
      '.venv',
      '',
      '# PyCharm',
      '.idea/',
      '',
      '# VS Code',
      '.vscode/',
      '',
      '# Jupyter Notebook',
      '.ipynb_checkpoints',
      '*.ipynb',
      '',
      '# pyenv',
      '.python-version',
      '',
      '# Environment variables',
      '.env',
      '.env.local',
      '',
      '# ML artifacts (trained models)',
      '*.pkl',
      '*.h5',
      '*.hdf5',
      '*.pb',
      '*.pth',
      '*.onnx',
      'models/',
      'checkpoints/',
      '',
      '# Data files (use DVC for large datasets)',
      '# Uncomment if using DVC:',
      '# *.csv',
      '# *.parquet',
      '# data/',
      '',
      '# Logs',
      '*.log',
      'logs/',
      '',
      '# Testing',
      '.pytest_cache/',
      '.coverage',
      'htmlcov/',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
      '',
      '# MLOps Agent',
      '*.state.json',
      '*.lock',
    ];

    return patterns.join('\n') + '\n';
  }

  /**
   * Generate scaffold summary
   */
  async generateSummary(files: GeneratedFile[]): Promise<string> {
    const summary = [
      '# MLOps Scaffold Summary',
      '',
      `Generated at: ${new Date().toISOString()}`,
      `Location: ${this.rootDir}`,
      '',
      '## Generated Files',
      '',
    ];

    // Group files by directory
    const filesByDir: { [key: string]: GeneratedFile[] } = {};
    
    for (const file of files) {
      const dir = path.dirname(file.path);
      if (!filesByDir[dir]) {
        filesByDir[dir] = [];
      }
      filesByDir[dir].push(file);
    }

    // Add files to summary
    for (const [dir, dirFiles] of Object.entries(filesByDir)) {
      summary.push(`### ${dir || 'Root'}`);
      summary.push('');
      
      for (const file of dirFiles) {
        const fileName = path.basename(file.path);
        summary.push(`- **${fileName}**: ${file.purpose}`);
      }
      
      summary.push('');
    }

    summary.push('## Next Steps');
    summary.push('');
    summary.push('1. Review the generated files');
    summary.push('2. Initialize Git repository: `git init`');
    summary.push('3. Commit files: `git add . && git commit -m "Initial scaffold"`');
    summary.push('4. Push to remote repository');
    summary.push('5. Configure CI/CD secrets and deployment targets');
    summary.push('');

    return summary.join('\n');
  }

  /**
   * Resolve file path within scaffold
   */
  private resolveFilePath(relativePath: string): string {
    return path.join(this.rootDir, relativePath);
  }

  /**
   * Get scaffold root directory
   */
  getRootDir(): string {
    return this.rootDir;
  }
}
