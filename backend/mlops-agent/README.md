# MLOps Automation Agent

Generates production-ready MLOps project scaffolds from Python ML models.

## Features

- Multi-Agent System for dependencies, Docker, CI/CD, and documentation
- Documentation guides for different expertise levels
- Comprehensive testing with unit tests
- MLflow integration for experiment tracking
- Docker containerization and CI/CD pipelines
- Makefile with development commands
- FastAPI REST API with health checks

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Generate a Scaffold

```bash
node dist/cli.js model.py
```

### CLI Options

```bash
node dist/cli.js <input-file.py> [options]
```

**Available Options:**

- `--project <name>` - Project name (default: `mlops-project`)
- `--cicd <platform>` - CI/CD platform: `github`, `gitlab`, or `both` (default: `both`)
- `--template <dir>` - Custom template directory path

**Examples:**

```bash
# Default project name
node dist/cli.js model.py

# Custom project name
node dist/cli.js model.py --project customer_churn_model

# Specific CI/CD platform only
node dist/cli.js model.py --cicd github

# All options combined
node dist/cli.js model.py --project my_ml_app --cicd github --template ./custom
```

### Output Location

All generated files are saved in the `/builds` directory:

```
/builds/
├── {project-name}_scaffold/          # Generated MLOps project
│   ├── src/
│   ├── tests/
│   ├── .github/workflows/
│   ├── docs/
│   └── ...
└── {project-name}_mlops_scaffold.zip # Compressed archive
```

## Generated Files

### Documentation
- `EASY_START.md` - Beginner-friendly guide
- `QUICK_START.md` - Quick reference
- `PRODUCTION_READY.md` - Production deployment guide
- `README.md` - Project documentation
- `SCAFFOLD_SUMMARY.md` - Generation details

### Source Code
- `src/sample_model.py` - Original model
- `src/predict.py` - Inference utilities
- `src/app.py` - FastAPI REST API
- `src/mlflow_utils.py` - Experiment tracking

### Testing
- `tests/test_model.py` - Unit tests

### Infrastructure
- `Dockerfile` - Container definition
- `.dockerignore` - Build optimizations
- `.github/workflows/main.yml` - GitHub Actions CI/CD
- `.gitlab-ci.yml` - GitLab CI/CD
- `Makefile` - Development commands
- `requirements.txt` - Python dependencies
- `.env.example` - Environment configuration

## Usage

```bash
node dist/cli.js model.py
cd mlops-project_scaffold
```

Refer to generated documentation guides for setup and deployment.
- Health check endpoints
- Batch prediction support
- Security best practices

## Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Test with Sample Model

```bash
node dist/cli.js sample_model.py
```

## Project Structure

```
.
├── src/
│   ├── agents/          # Specialized agents
│   │   ├── SupervisorAgent.ts
│   │   ├── DependencyAgent.ts
│   │   ├── DockerAgent.ts
│   │   ├── CICDAgent.ts
│   │   └── DocumentationAgent.ts
│   ├── core/            # Core components
│   │   ├── LLMProvider.ts
│   │   ├── StateManager.ts
│   │   ├── FileValidator.ts
│   │   ├── ScaffoldBuilder.ts
│   │   ├── ZipPackager.ts
│   │   └── Config.ts
│   ├── cli.ts           # CLI interface
│   └── index.ts         # Main entry point
├── tests/               # Unit tests
├── builds/              # Generated zip files
├── .env                 # OpenRouter API key
└── sample_model.py      # Example model for testing
```

## Configuration

### Environment Variables

Create a `.env` file with your OpenRouter API key:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

## Generated Scaffold Commands

Each generated scaffold includes a Makefile with these commands:

```bash
make help          # Show all commands
make install       # Install dependencies
make train         # Train the model
make test          # Run tests with coverage
make serve         # Start API server
make docker-build  # Build Docker image
make docker-run    # Run Docker container
make clean         # Remove generated files
make mlflow-ui     # Start MLflow UI
```

## Requirements

- Node.js 18+
- Python 3.11+ (for generated scaffolds)
- OpenRouter API key
- (Optional) Docker
- (Optional) Make

## Architecture

```
User Input (Python Model)
         ↓
    CLI Interface
         ↓
  Supervisor Agent
         ↓
    ┌────┴────┬────────┬──────────┐
    ↓         ↓        ↓          ↓
Dependency  Docker  CI/CD  Documentation
  Agent     Agent   Agent      Agent
    ↓         ↓        ↓          ↓
    └────┬────┴────────┴──────────┘
         ↓
  Scaffold Builder
         ↓
   Zip Packager
         ↓
  builds/*.zip (17 files)
```

## Testing

Unit tests (vitest) cover the LLM provider's rate limiting and retries, and dependency analysis (PyPI name mapping, standard-library detection):

```bash
npm test
```


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit a pull request

## License

MIT

## Support

For issues or questions:
1. Check the generated documentation in your scaffold
2. Review the example `sample_model.py`
3. Run tests to verify setup: `npm test`

## Roadmap

- [x] Multi-agent architecture
- [x] LLM integration
- [x] Unit tests (provider, dependency analysis)
- [x] CLI interface
- [x] Zip packaging
- [x] Production enhancements
- [x] Project-specific documentation
- [ ] TensorFlow/PyTorch support
- [ ] Kubernetes Helm charts
- [ ] Terraform infrastructure
- [ ] Model monitoring dashboards

---

The agent generates scaffolds (API, Docker, CI, MLflow hooks, tests, docs). It does not retrain or version models by itself.

```bash
node dist/cli.js your_model.py
```
