# MLOps Automation Agent - Implementation Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent System](#agent-system)
3. [Core Components](#core-components)
4. [Implementation Details](#implementation-details)
5. [Extension Guide](#extension-guide)

## Architecture Overview

### Design Pattern

The MLOps Automation Agent uses a **Supervisor-Agent Architecture**:

```
┌─────────────────────────────────────────────┐
│         Supervisor Agent                    │
│  (Orchestrates workflow, manages state)     │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┼──────┬──────────┬────────┐
        ▼      ▼      ▼          ▼        ▼
    ┌────────────────────────────────────────┐
    │ Dependency │ Docker │ CI/CD │ Docs   │
    │   Agent    │ Agent  │ Agent │ Agent  │
    └────────────────────────────────────────┘
        │      │      │          │        │
        └──────┼──────┼──────────┼────────┘
               │
        ┌──────▼──────────────────┐
        │   Scaffold Builder      │
        │   (File organization)   │
        └─────────────────────────┘
```

### State Management

The `StateManager` tracks workflow execution:

```typescript
WorkflowState = {
  inputFile: string
  timestamp: Date
  agentResults: Map<AgentType, AgentResult>
  generatedFiles: GeneratedFile[]
  status: 'in_progress' | 'completed' | 'failed'
  auditTrail: AuditEntry[]
}
```

## Agent System

### 1. Dependency Agent (`src/agents/DependencyAgent.ts`)

**Purpose:** Extract Python dependencies from source code

**Key Methods:**

```typescript
analyzeDependencies(fileContent: string): Promise<DependencyAnalysis>
```

**Implementation:**

1. **AST Parsing** - Uses Python's Abstract Syntax Tree to parse imports
2. **Classification** - Separates standard library vs third-party packages
3. **Generation** - Creates optimized requirements.txt

**Detected Capabilities:**
- Direct imports: `import numpy`
- From imports: `from sklearn import`
- Conditional imports: `try: import torch`
- Version specifiers: `import pandas>=1.0`

### 2. Docker Agent (`src/agents/DockerAgent.ts`)

**Purpose:** Generate optimized Dockerfile configurations

**Key Methods:**

```typescript
selectBaseImage(dependencies: string[]): string
generateDockerfile(dependencies: string[]): string
```

**Base Image Selection Logic:**

```
If TensorFlow found → use tensorflow/tensorflow:latest
Else if PyTorch found → use pytorch/pytorch:latest
Else if JAX found → use python:3.11-slim
Else → use python:3.11-slim (default)
```

**Dockerfile Optimization:**

- Layer caching: requirements first, then code
- Multi-stage builds (future enhancement)
- Minimal image size with `-slim` variants
- Security best practices

### 3. CI/CD Agent (`src/agents/CICDAgent.ts`)

**Purpose:** Generate continuous integration/deployment configurations

**Key Methods:**

```typescript
generateGitHubActions(context: CICDContext): Promise<string>
generateGitLabCI(context: CICDContext): Promise<string>
renderTemplate(template: string, variables: TemplateVariables): string
```

**GitHub Actions Workflow:**

```yaml
Triggers: push to main branch
Jobs:
  - test: Run pytest suite
  - build: Build Docker image
  - deploy: Push to registry
```

**GitLab CI Pipeline:**

```yaml
Stages: test → build → deploy
Artifacts: Coverage reports, Docker images
Caching: pip cache, Docker layers
```

**Template Variables:**

```typescript
{
  projectName: string
  repositoryName: string
  pythonVersion: string
  hasTests: boolean
  deploymentTarget?: string
}
```

### 4. Documentation Agent (`src/agents/DocumentationAgent.ts`)

**Purpose:** Generate multi-level documentation

**Key Methods:**

```typescript
generateREADME(scaffold: ScaffoldState): Promise<string>
createSetupInstructions(dependencies: string[]): string
createArchitectureOverview(files: string[]): string
createMLDeploymentNotes(dependencies: string[]): string
generateNextSteps(scaffold: ScaffoldState): string
```

**Documentation Levels:**

**EASY_START.md** (Beginner)
- 5-step quick setup
- Visual diagrams
- Copy-paste commands
- No technical jargon

**QUICK_START.md** (Developer)
- Architecture overview
- API reference
- Development workflows
- Code examples

**PRODUCTION_READY.md** (DevOps)
- Deployment strategies
- Security configurations
- Monitoring setup
- Scaling considerations

**Customization:**

Detects and adapts to:
- ML frameworks (TensorFlow, PyTorch, scikit-learn)
- Database systems
- API frameworks (FastAPI, Flask)
- Monitoring tools

### 5. Supervisor Agent (`src/agents/SupervisorAgent.ts`)

**Purpose:** Orchestrate all agents and manage workflow

**Key Methods:**

```typescript
processModelFile(filePath: string): Promise<ScaffoldResult>
createExecutionPlan(fileContent: string): ExecutionPlan
delegateTask(agentType: string, context: AgentContext): Promise<AgentResult>
handleAgentFailure(agentType: string, error: Error): Promise<void>
```

**Execution Plan:**

```typescript
ExecutionPlan = {
  steps: [
    { agentType: 'dependency', priority: 1, requiredContext: ['fileContent'] },
    { agentType: 'docker', priority: 2, requiredContext: ['fileContent', 'dependencies'] },
    { agentType: 'cicd', priority: 3, requiredContext: ['dependencies', 'dockerConfig'] },
    { agentType: 'documentation', priority: 4, requiredContext: ['all'] }
  ]
  dependencies: Map of agent dependencies
}
```

**Workflow Orchestration:**

1. Read input file
2. Create execution plan (respects dependencies)
3. Execute agents sequentially
4. Update state after each agent
5. Handle failures gracefully
6. Return complete scaffold

## Core Components

### LLMProvider (`src/core/LLMProvider.ts`)

**Purpose:** Interface with LLM for intelligent generation

**Implementation:**

```typescript
class LLMProvider {
  sendRequest(prompt: string, options?: LLMOptions): Promise<string>
  streamRequest(prompt: string): AsyncIterableIterator<string>
}
```

**Configuration:**

- Provider: OpenRouter API
- Default Model: mistralai/devstral-2512:free
- Custom headers: HTTP-Referer, X-Title
- Temperature: 0.7 (creative but consistent)
- Max tokens: 4096

### FileValidator (`src/core/FileValidator.ts`)

**Purpose:** Validate input files before processing

**Validations:**

```typescript
✓ File exists
✓ File extension is .py
✓ File size < 10MB
✓ File is readable
✓ Valid Python syntax
```

### StateManager (`src/core/StateManager.ts`)

**Purpose:** Track workflow execution state

**Features:**

- Persistent state storage (mlops-agent.state.json)
- Audit trail of all operations
- Rollback capabilities
- Concurrent execution safety with locks

**State Transitions:**

```
Initial → In Progress → Completed
       ↘              ↙ Failed
```

### ScaffoldBuilder (`src/core/ScaffoldBuilder.ts`)

**Purpose:** Organize and create output directory structure

**Structure Created:**

```
{buildDir}/{projectName}_scaffold/
├── .github/
│   └── workflows/
│       └── main.yml
├── src/
│   ├── predict.py
│   ├── app.py
│   ├── mlflow_utils.py
│   └── {input_model}.py
├── tests/
│   └── test_model.py
├── docs/
├── Dockerfile
├── .dockerignore
├── requirements.txt
├── .gitlab-ci.yml
├── Makefile
├── .env.example
├── .gitignore
├── README.md
├── EASY_START.md
├── QUICK_START.md
├── PRODUCTION_READY.md
└── SCAFFOLD_SUMMARY.md
```

### ZipPackager (`src/core/ZipPackager.ts`)

**Purpose:** Create compressed archives of generated scaffolds

**Features:**

```typescript
createZipArchive(dir: string, projectName: string): Promise<string>
verifyArchive(zipPath: string): Promise<boolean>
```

**Compression:** zlib level 9 (maximum)

### Config (`src/core/Config.ts`)

**Purpose:** Manage configuration from environment and files

**Configuration Priority:**

1. Environment variables
2. Config file (.mlops.json)
3. Default values

**Configurable Settings:**

```typescript
{
  llm: { provider, apiKey, model, temperature },
  cicd: { platform, templateDir },
  docker: { defaultPythonVersion, baseImageRegistry },
  output: { scaffoldDir, zipOutputDir }
}
```

## Implementation Details

### Data Flow

#### 1. Input Validation

```typescript
// src/cli.ts
const validation = await validator.validateFile(inputFile);
if (!validation.valid) {
  exit with error
}
```

#### 2. File Processing

```typescript
// src/agents/SupervisorAgent.ts
const fileContent = await fs.readFile(filePath, 'utf-8');
const plan = this.createExecutionPlan(fileContent);
```

#### 3. Agent Execution

```typescript
// Each agent processes context and returns artifacts
for (const step of plan.steps) {
  const result = await this.delegateTask(step.agentType, context);
  this.stateManager.updateState(step.agentType, result);
  updateContextForNextAgent(result);
}
```

#### 4. Scaffold Generation

```typescript
// src/core/ScaffoldBuilder.ts
await scaffoldBuilder.createStructure();
await scaffoldBuilder.placeFiles(generatedFiles);
await scaffoldBuilder.generateSummary();
```

#### 5. Packaging

```typescript
// src/core/ZipPackager.ts
const zipPath = await zipPackager.createZipArchive(
  scaffoldDir, 
  projectName
);
```

### Error Handling

**Validation Errors:**
- Caught before processing
- Clear error messages
- Exit with status 1

**Processing Errors:**
- Agent failures logged
- Graceful degradation
- Audit trail maintained
- Detailed error reports

**Recovery:**
- State checkpoint allows resume
- Lock file prevents concurrent execution
- Validation before retry

## Extension Guide

### Adding a New Agent

1. **Create Agent Class:**

```typescript
// src/agents/NewAgent.ts
export class NewAgent {
  constructor(private llmProvider: LLMProvider) {}
  
  async process(context: AgentContext): Promise<AgentResult> {
    // Implementation
    return {
      agentType: 'newagent',
      status: 'success',
      artifacts: [],
      timestamp: new Date()
    };
  }
}
```

2. **Register in Supervisor:**

```typescript
// src/agents/SupervisorAgent.ts
this.newAgent = new NewAgent(llmProvider);
```

3. **Add to Execution Plan:**

```typescript
createExecutionPlan(fileContent: string): ExecutionPlan {
  return {
    steps: [
      // ... existing steps
      { agentType: 'newagent', priority: 5, requiredContext: [...] }
    ]
  };
}
```

4. **Implement Delegation:**

```typescript
async delegateTask(agentType: string, context: AgentContext) {
  switch(agentType) {
    // ... existing cases
    case 'newagent':
      return await this.newAgent.process(context);
  }
}
```

### Customizing Template Generation

**For Documentation:**

```typescript
// src/agents/DocumentationAgent.ts
private customizeForFramework(framework: string): string {
  if (framework === 'tensorflow') {
    return tensorflowSpecificGuide;
  }
  // Add more customizations
}
```

**For CI/CD:**

```typescript
// src/agents/CICDAgent.ts
private getCustomTemplate(platform: string): string {
  // Load from custom template directory
  // Apply org-specific settings
}
```

### Adding New File Types

**Example: Add configuration file**

```typescript
// In DocumentationAgent
const configFile = this.generateConfig();
artifacts.push({
  path: 'config.yaml',
  content: configFile,
  purpose: 'Configuration template'
});
```

## Testing

### Test Structure

```typescript
// tests/LLMProvider.test.ts
describe('LLMProvider', () => {
  it('should send request to LLM', async () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
```

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing** - Run independent agents concurrently (future)
2. **Caching** - Cache LLM responses for similar inputs
3. **Streaming** - Stream long responses instead of waiting
4. **Lazy Loading** - Load templates on demand

### Scalability

- **Input Size**: Tested with models up to 10MB
- **Dependencies**: Handles 100+ dependencies
- **Concurrent Requests**: Queue-based processing (future)

## Debugging

### Enable Debug Logging

```bash
DEBUG=mlops:* npm run dev
```

### State Inspection

```bash
cat mlops-agent.state.json
```

### Common Issues

| Issue | Solution |
|-------|----------|
| API Key missing | Set OPENROUTER_API_KEY environment variable |
| File not found | Verify file path, use absolute paths |
| Port in use | Change port in config |
| Permission denied | Check file/directory permissions |

## Contributing

### Code Style

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Meaningful variable names

### Before Submitting PR

```bash
npm run build          # Verify build
npm run test           # Pass all tests
npm run lint           # Check style (if configured)
```

## Future Enhancements

### Planned Features

- [ ] Parallel agent execution
- [ ] Cloud deployment templates (AWS, GCP, Azure)
- [ ] Database integration templates
- [ ] Monitoring and logging setup
- [ ] Security scanning integration
- [ ] Cost estimation
- [ ] Model performance dashboard
- [ ] A/B testing framework

### Research Areas

- LLM fine-tuning for specific domains
- Automatic code quality improvements
- Advanced dependency resolution
- Intelligent resource sizing

## References

- [LLMProvider Documentation](./src/core/LLMProvider.ts)
- [Agent System](./src/agents/)
- [Core Components](./src/core/)
- [OpenRouter API](https://openrouter.ai)
- [TypeScript Documentation](https://www.typescriptlang.org)
