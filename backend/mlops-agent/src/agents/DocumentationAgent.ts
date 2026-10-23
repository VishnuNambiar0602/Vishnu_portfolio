import { LLMProvider } from '../core/LLMProvider.js';
import { WorkflowState, GeneratedFile } from '../core/StateManager.js';

export interface DockerConfig {
  baseImage: string;
  pythonVersion: string;
}

export interface CICDConfig {
  platform: string;
  hasTests: boolean;
}

export interface ScaffoldState {
  files: GeneratedFile[];
  dependencies: string[];
  dockerConfig: DockerConfig;
  cicdConfig: CICDConfig;
}

export class DocumentationAgent {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Generate README.md
   */
  async generateREADME(scaffold: ScaffoldState): Promise<string> {
    const hasMLFrameworks = this.detectMLFrameworks(scaffold.dependencies);
    
    let readme = `# MLOps Project

## Overview

This project contains an MLOps deployment scaffold with containerization, CI/CD pipelines, and production configuration.

`;

    readme += this.createSetupInstructions(scaffold.dependencies);
    readme += '\n\n';

    readme += this.createArchitectureOverview(scaffold.files.map(f => f.path));
    readme += '\n\n';

    readme += this.createUsageGuide('model.py');
    readme += '\n\n';

    if (hasMLFrameworks) {
      readme += this.createMLDeploymentNotes(scaffold.dependencies);
      readme += '\n\n';
    }

    // Add next steps
    readme += this.generateNextSteps(scaffold);

    return readme;
  }

  /**
   * Create setup instructions section
   */
  createSetupInstructions(dependencies: string[]): string {
    return `## Setup Instructions

### Prerequisites

- Python 3.11+
- Docker
- Git

### Local Development

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd <project-directory>
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Docker Deployment

1. Build the Docker image:
\`\`\`bash
docker build -t mlops-project:latest .
\`\`\`

2. Run the container:
\`\`\`bash
docker run -p 8000:8000 mlops-project:latest
\`\`\``;
  }

  /**
   * Create architecture overview section
   */
  createArchitectureOverview(components: string[]): string {
    let overview = `## Architecture

This project follows MLOps best practices with the following components:

### Generated Files

`;

    const fileDescriptions: { [key: string]: string } = {
      'requirements.txt': 'Python dependencies extracted from your model',
      'Dockerfile': 'Container configuration optimized for ML workloads',
      '.dockerignore': 'Files excluded from Docker build context',
      'main.yml': 'GitHub Actions CI/CD pipeline',
      '.gitlab-ci.yml': 'GitLab CI/CD pipeline',
      '.gitignore': 'Git ignore patterns for Python ML projects',
    };

    for (const component of components) {
      const filename = component.split('/').pop() || component;
      const description = fileDescriptions[filename] || 'Project file';
      overview += `- **${filename}**: ${description}\n`;
    }

    overview += `
### Deployment Flow

1. **Development**: Write and test your model locally
2. **Containerization**: Docker packages your model with all dependencies
3. **CI/CD**: Automated testing and deployment on code push
4. **Production**: Deploy to your target environment`;

    return overview;
  }

  /**
   * Create usage guide section
   */
  createUsageGuide(entryPoint: string): string {
    return `## Usage

### Running Locally

\`\`\`bash
python ${entryPoint}
\`\`\`

### Running with Docker

\`\`\`bash
docker run mlops-project:latest
\`\`\`

### CI/CD Pipeline

The pipeline automatically:
- Runs tests on every push
- Builds Docker images
- Deploys to production (on main branch)

Push to your repository to trigger the pipeline:
\`\`\`bash
git add .
git commit -m "Update model"
git push origin main
\`\`\``;
  }

  /**
   * Create ML-specific deployment notes
   */
  createMLDeploymentNotes(dependencies: string[]): string {
    const frameworks = [];
    
    if (dependencies.some(d => d.includes('tensorflow'))) {
      frameworks.push('TensorFlow');
    }
    if (dependencies.some(d => d.includes('torch') || d.includes('pytorch'))) {
      frameworks.push('PyTorch');
    }
    if (dependencies.some(d => d.includes('sklearn') || d.includes('scikit'))) {
      frameworks.push('scikit-learn');
    }

    let notes = `## ML Framework Notes

This project uses: ${frameworks.join(', ')}

### Model Serving Considerations

`;

    if (frameworks.includes('TensorFlow')) {
      notes += `- **TensorFlow**: Consider using TensorFlow Serving for production deployment
- GPU support: Use \`tensorflow/tensorflow:latest-gpu\` base image
`;
    }

    if (frameworks.includes('PyTorch')) {
      notes += `- **PyTorch**: Consider using TorchServe for production deployment
- GPU support: Use \`pytorch/pytorch:latest\` with CUDA
`;
    }

    notes += `
### Performance Optimization

- Enable model quantization for faster inference
- Use batch prediction for better throughput
- Consider model caching for frequently used models
- Monitor GPU utilization if using GPU instances`;

    return notes;
  }

  /**
   * Generate next steps section
   */
  generateNextSteps(scaffold: ScaffoldState): string {
    return `## Next Steps

### 1. Version Control

Initialize a Git repository and push to your remote:
\`\`\`bash
git init
git add .
git commit -m "Initial MLOps scaffold"
git remote add origin <your-repo-url>
git push -u origin main
\`\`\`

### 2. Configure CI/CD

- Set up repository secrets for deployment credentials
- Configure deployment targets in CI/CD workflows
- Add environment-specific configuration

### 3. Monitoring & Observability

Consider adding:
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Weights & Biases**: ML experiment tracking
- **MLflow**: Model versioning and registry

### 4. Testing

Add comprehensive tests:
- Unit tests for model functions
- Integration tests for API endpoints
- Performance tests for inference latency
- Data validation tests

### 5. Security

- Scan Docker images for vulnerabilities
- Use secrets management (e.g., AWS Secrets Manager)
- Implement API authentication
- Enable HTTPS/TLS

### 6. Scaling

- Set up horizontal pod autoscaling (Kubernetes)
- Implement load balancing
- Use model serving frameworks (TensorFlow Serving, TorchServe)
- Consider serverless deployment (AWS Lambda, Google Cloud Functions)

## Support

For issues or questions, please refer to the project documentation or contact the development team.`;
  }

  /**
   * Detect ML frameworks in dependencies
   */
  private detectMLFrameworks(dependencies: string[]): boolean {
    const mlFrameworks = ['tensorflow', 'torch', 'pytorch', 'sklearn', 'scikit-learn', 
                          'keras', 'jax', 'xgboost', 'lightgbm'];
    
    return dependencies.some(dep => 
      mlFrameworks.some(framework => dep.toLowerCase().includes(framework))
    );
  }
}
