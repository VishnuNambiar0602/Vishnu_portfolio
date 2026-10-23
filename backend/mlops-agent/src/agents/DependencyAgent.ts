import { spawn } from 'child_process';
import { LLMProvider } from '../core/LLMProvider.js';

export interface DependencyAnalysis {
  standardLibrary: string[];
  externalPackages: string[];
  conditionalImports: ConditionalImport[];
}

export interface ConditionalImport {
  packageName: string;
  condition: string;
}

export class DependencyAgent {
  private llmProvider: LLMProvider;
  
  // Python standard library modules (common ones)
  private readonly STANDARD_LIBRARY = new Set([
    'abc', 'argparse', 'ast', 'asyncio', 'base64', 'collections', 'copy', 'csv',
    'datetime', 'decimal', 'enum', 'functools', 'glob', 'hashlib', 'heapq', 'io',
    'itertools', 'json', 'logging', 'math', 'os', 'pathlib', 'pickle', 'random',
    're', 'shutil', 'socket', 'sqlite3', 'string', 'subprocess', 'sys', 'tempfile',
    'threading', 'time', 'typing', 'unittest', 'urllib', 'uuid', 'warnings', 'weakref',
    'xml', 'zipfile', '__future__', 'builtins', 'contextlib', 'dataclasses', 'email',
    'html', 'http', 'importlib', 'inspect', 'multiprocessing', 'operator', 'queue',
    'secrets', 'selectors', 'signal', 'statistics', 'struct', 'traceback', 'types',
  ]);

  private readonly PYPI_NAMES: Record<string, string> = {
    sklearn: 'scikit-learn',
    cv2: 'opencv-python',
    PIL: 'pillow',
    yaml: 'pyyaml',
    bs4: 'beautifulsoup4',
    skimage: 'scikit-image',
    dotenv: 'python-dotenv',
    dateutil: 'python-dateutil',
  };

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Analyze dependencies
   */
  async analyzeDependencies(fileContent: string): Promise<DependencyAnalysis> {
    try {
      const imports = await this.parseImportsWithAST(fileContent);
      
      const standardLibrary: string[] = [];
      const externalPackages: string[] = [];

      for (const imp of imports) {
        if (this.isStandardLibrary(imp)) {
          standardLibrary.push(imp);
        } else {
          externalPackages.push(imp);
        }
      }

      return {
        standardLibrary,
        externalPackages,
        conditionalImports: [],
      };
    } catch (error: any) {
      console.error('Failed to analyze dependencies:', error.message);
      return this.fallbackRegexParsing(fileContent);
    }
  }

  /**
   * Parse imports
   */
  private async parseImportsWithAST(fileContent: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import ast
import sys

code = sys.stdin.read()
try:
    tree = ast.parse(code)
    imports = set()
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                # Get top-level package name
                package = alias.name.split('.')[0]
                imports.add(package)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                # Get top-level package name
                package = node.module.split('.')[0]
                imports.add(package)
    
    stdlib = getattr(sys, "stdlib_module_names", ())
    for imp in sorted(imports):
        print(imp + ("\\tstd" if imp in stdlib else ""))
except SyntaxError as e:
    sys.stderr.write(f"Syntax error: {e}\\n")
    sys.exit(1)
`;

      const python = spawn('python', ['-c', pythonScript]);
      let stdout = '';
      let stderr = '';

      python.stdin.write(fileContent);
      python.stdin.end();

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python AST parsing failed: ${stderr}`));
        } else {
          const imports = stdout
            .trim()
            .split('\n')
            .filter(line => line.length > 0)
            .map(line => {
              const [name, flag] = line.trim().split('\t');
              if (flag === 'std') this.STANDARD_LIBRARY.add(name);
              return name;
            });
          resolve(imports);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  /**
   * Fallback regex-based import parsing
   */
  private fallbackRegexParsing(fileContent: string): DependencyAnalysis {
    const imports = new Set<string>();
    
    // Match import statements
    const importRegex = /^import\s+([a-zA-Z0-9_]+)/gm;
    const fromImportRegex = /^from\s+([a-zA-Z0-9_]+)/gm;

    let match;
    while ((match = importRegex.exec(fileContent)) !== null) {
      imports.add(match[1]);
    }

    while ((match = fromImportRegex.exec(fileContent)) !== null) {
      imports.add(match[1]);
    }

    const standardLibrary: string[] = [];
    const externalPackages: string[] = [];

    for (const imp of imports) {
      if (this.isStandardLibrary(imp)) {
        standardLibrary.push(imp);
      } else {
        externalPackages.push(imp);
      }
    }

    return {
      standardLibrary,
      externalPackages,
      conditionalImports: [],
    };
  }

  /**
   * Check if a package is in the standard library
   */
  private isStandardLibrary(packageName: string): boolean {
    return this.STANDARD_LIBRARY.has(packageName);
  }

  /**
   * Filter external packages from a list of imports
   */
  filterExternalPackages(imports: string[]): string[] {
    return imports.filter(imp => !this.isStandardLibrary(imp));
  }

  /**
   * Generate requirements.txt content
   */
  generateRequirements(analysis: DependencyAnalysis): string {
    if (analysis.externalPackages.length === 0) {
      return '# No external dependencies detected\n';
    }

    // Import names differ from PyPI names for some packages (e.g. `import sklearn` needs scikit-learn).
    const lines = [...new Set(analysis.externalPackages.map(pkg => this.PYPI_NAMES[pkg] ?? pkg))];
    
    // Add common MLOps dependencies
    const mlopsPackages = [
      '',
      '# MLOps and API dependencies',
      'fastapi>=0.104.0',
      'uvicorn[standard]>=0.24.0',
      'pydantic>=2.0.0',
      '',
      '# Testing',
      'pytest>=7.4.0',
      'pytest-cov>=4.1.0',
      '',
      '# Experiment tracking (optional)',
      '# mlflow>=2.8.0',
      '# wandb>=0.16.0',
    ];
    
    return lines.join('\n') + '\n' + mlopsPackages.join('\n') + '\n';
  }
}
