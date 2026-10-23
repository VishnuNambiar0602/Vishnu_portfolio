import { LLMProvider } from '../core/LLMProvider.js';

export interface DockerConfig {
  baseImage: string;
  pythonVersion: string;
  workdir: string;
}

export class DockerAgent {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Select base image based on dependencies
   */
  selectBaseImage(dependencies: string[], pythonVersion: string = '3.11'): string {
    const hasTensorFlow = dependencies.some(dep => 
      dep.toLowerCase().includes('tensorflow')
    );
    const hasPyTorch = dependencies.some(dep => 
      dep.toLowerCase().includes('torch') || dep.toLowerCase().includes('pytorch')
    );
    const hasJax = dependencies.some(dep => 
      dep.toLowerCase().includes('jax')
    );

    if (hasTensorFlow) {
      return 'tensorflow/tensorflow:latest';
    }
    if (hasPyTorch) {
      return `pytorch/pytorch:latest`;
    }
    if (hasJax) {
      return `python:${pythonVersion}-slim`;
    }

    return `python:${pythonVersion}-slim`;
  }

  /**
   * Generate Dockerfile
   */
  generateDockerfile(dependencies: string[], pythonVersion: string = '3.11'): string {
    const baseImage = this.selectBaseImage(dependencies, pythonVersion);
    
    const dockerfile = `FROM ${baseImage}

WORKDIR /app

RUN apt-get update && apt-get install -y \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PYTHONUNBUFFERED=1

CMD ["python", "src/sample_model.py"]
`;

    return dockerfile;
  }

  /**
   * Generate .dockerignore file
   */
  generateDockerignore(): string {
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
      '*.egg-info/',
      '.installed.cfg',
      '*.egg',
      '',
      '# Virtual environments',
      'venv/',
      'env/',
      'ENV/',
      '.venv',
      '',
      '# IDEs',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '*~',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
      '',
      '# Git',
      '.git/',
      '.gitignore',
      '.gitattributes',
      '',
      '# Testing',
      '.pytest_cache/',
      '.coverage',
      'htmlcov/',
      '',
      '# Jupyter',
      '.ipynb_checkpoints/',
      '*.ipynb',
      '',
      '# CI/CD',
      '.github/',
      '.gitlab-ci.yml',
      '',
      '# Documentation',
      'docs/',
      '*.md',
      '!README.md',
      '',
      '# Note: Include data files needed for training',
      '# Uncomment these if using external data sources:',
      '# *.csv',
      '# *.pkl',
      '# *.h5',
    ];

    return patterns.join('\n') + '\n';
  }

  /**
   * Optimize Dockerfile layers
   */
  optimizeLayers(dockerfile: string): string {
    // Already optimized in generateDockerfile
    // Dependencies are installed before code copy for better caching
    return dockerfile;
  }
}
