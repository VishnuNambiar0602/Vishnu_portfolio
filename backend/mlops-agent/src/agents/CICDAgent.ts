import nunjucks from 'nunjucks';
import { LLMProvider } from '../core/LLMProvider.js';

export interface CICDContext {
  projectName: string;
  repositoryName: string;
  pythonVersion: string;
  hasTests: boolean;
  deploymentTarget?: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export class CICDAgent {
  private llmProvider: LLMProvider;
  private templateDir: string;

  constructor(llmProvider: LLMProvider, templateDir?: string) {
    this.llmProvider = llmProvider;
    this.templateDir = templateDir || '';
  }

  /**
   * Generate GitHub Actions workflow
   */
  async generateGitHubActions(context: CICDContext): Promise<string> {
    const template = this.getGitHubActionsTemplate();
    const rendered = this.renderTemplate(template, context as unknown as TemplateVariables);
    
    if (!this.validateYAML(rendered)) {
      throw new Error('Generated GitHub Actions workflow is invalid YAML');
    }

    return rendered;
  }

  /**
   * Generate GitLab CI configuration
   */
  async generateGitLabCI(context: CICDContext): Promise<string> {
    const template = this.getGitLabCITemplate();
    const rendered = this.renderTemplate(template, context as unknown as TemplateVariables);
    
    if (!this.validateYAML(rendered)) {
      throw new Error('Generated GitLab CI configuration is invalid YAML');
    }

    return rendered;
  }

  /**
   * Render template with variables
   */
  renderTemplate(templateContent: string, variables: TemplateVariables): string {
    try {
      nunjucks.configure({ autoescape: false });
      
      const varsWithDefaults = {
        projectName: 'mlops-project',
        repositoryName: 'mlops-repo',
        pythonVersion: '3.11',
        hasTests: false,
        ...variables,
      };

      return nunjucks.renderString(templateContent, varsWithDefaults);
    } catch (error: any) {
      console.error('Template rendering failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate YAML syntax
   */
  validateYAML(content: string): boolean {
    try {
      // Try to parse as YAML
      const lines = content.split('\n');
      let yamlContent = '';
      
      // Simple validation - check for basic YAML structure
      for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#')) {
          yamlContent += line + '\n';
        }
      }

      // Basic checks
      if (!yamlContent.trim()) {
        return false;
      }

      // Check for balanced indentation (simplified)
      const indentPattern = /^(\s*)/;
      let prevIndent = 0;
      
      for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#')) {
          const match = line.match(indentPattern);
          const indent = match ? match[1].length : 0;
          
          // Indentation should be consistent (multiples of 2)
          if (indent % 2 !== 0) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get GitHub Actions template
   */
  private getGitHubActionsTemplate(): string {
    return `name: MLOps CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python {{ pythonVersion }}
        uses: actions/setup-python@v4
        with:
          python-version: {{ pythonVersion }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: |
          pytest tests/ -v --cov=src --cov-report=term-missing

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Build Docker image
        run: |
          docker build -t {{ projectName }}:latest .
      
      - name: Test Docker image
        run: |
          docker run --rm {{ projectName }}:latest python --version

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to {{ deploymentTarget | default('production') }}
        run: |
          echo "Deploying to {{ deploymentTarget | default('production') }}"
          # Add your deployment commands here
`;
  }

  /**
   * Get GitLab CI template
   */
  private getGitLabCITemplate(): string {
    return `stages:
  - test
  - build
  - deploy

variables:
  PYTHON_VERSION: "{{ pythonVersion }}"
  PROJECT_NAME: "{{ projectName }}"

test:
  stage: test
  image: python:{{ pythonVersion }}
  script:
    - pip install -r requirements.txt
    {% if hasTests %}- pip install pytest
    - pytest{% endif %}
  only:
    - main
    - develop
    - merge_requests

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t {{ projectName }}:latest .
    - docker run --rm {{ projectName }}:latest python --version
  only:
    - main
    - develop

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deploying to {{ deploymentTarget | default('production') }}"
    # Add your deployment commands here
  only:
    - main
  when: manual
`;
  }
}
