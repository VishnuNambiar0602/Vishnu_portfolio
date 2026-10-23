import * as fs from 'fs/promises';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
  purpose: string;
}

export interface AgentResult {
  agentType: string;
  status: 'success' | 'failure';
  artifacts: GeneratedFile[];
  error?: Error;
  timestamp: Date;
}

export type AgentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface WorkflowState {
  inputFile: string;
  timestamp: Date;
  agentResults: Map<string, AgentResult>;
  generatedFiles: GeneratedFile[];
  status: 'in_progress' | 'completed' | 'failed';
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  agentType: string;
  action: string;
  details: string;
}

export class StateManager {
  private state: WorkflowState;
  private stateFilePath: string;
  private lockFilePath: string;

  constructor(inputFile: string, stateDir: string = '.') {
    this.stateFilePath = path.join(stateDir, 'mlops-agent.state.json');
    this.lockFilePath = path.join(stateDir, 'mlops-agent.lock');
    
    this.state = {
      inputFile,
      timestamp: new Date(),
      agentResults: new Map(),
      generatedFiles: [],
      status: 'in_progress',
      auditTrail: [],
    };
  }

  /**
   * Update state with agent result
   */
  updateState(agentType: string, result: AgentResult): void {
    this.state.agentResults.set(agentType, result);
    
    if (result.artifacts) {
      this.state.generatedFiles.push(...result.artifacts);
    }

    this.state.auditTrail.push({
      timestamp: new Date(),
      agentType,
      action: result.status === 'success' ? 'completed' : 'failed',
      details: result.error?.message || 'Agent execution completed',
    });

    if (result.status === 'failure') {
      this.state.status = 'failed';
    }
  }

  /**
   * Get current state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * Get all generated files
   */
  getGeneratedFiles(): GeneratedFile[] {
    return [...this.state.generatedFiles];
  }

  /**
   * Get status of a specific agent
   */
  getAgentStatus(agentType: string): AgentStatus {
    const result = this.state.agentResults.get(agentType);
    
    if (!result) {
      return 'pending';
    }
    
    if (result.status === 'success') {
      return 'completed';
    }
    
    if (result.status === 'failure') {
      return 'failed';
    }
    
    return 'in_progress';
  }

  /**
   * Check if workflow is complete
   */
  isComplete(): boolean {
    return this.state.status === 'completed' || this.state.status === 'failed';
  }

  /**
   * Mark workflow as complete
   */
  markComplete(): void {
    this.state.status = 'completed';
    this.state.auditTrail.push({
      timestamp: new Date(),
      agentType: 'supervisor',
      action: 'workflow_completed',
      details: 'All agents completed successfully',
    });
  }

  /**
   * Persist state to disk
   */
  async persistState(): Promise<void> {
    try {
      // Acquire lock
      await this.acquireLock();

      // Convert Map to object for JSON serialization
      const serializable = {
        ...this.state,
        agentResults: Object.fromEntries(this.state.agentResults),
      };

      await fs.writeFile(
        this.stateFilePath,
        JSON.stringify(serializable, null, 2),
        'utf-8'
      );

      // Release lock
      await this.releaseLock();
    } catch (error: any) {
      console.error('Failed to persist state:', error.message);
      throw error;
    }
  }

  /**
   * Load state from disk
   */
  async loadState(): Promise<WorkflowState> {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Convert object back to Map
      this.state = {
        ...parsed,
        agentResults: new Map(Object.entries(parsed.agentResults || {})),
        timestamp: new Date(parsed.timestamp),
      };

      return this.getState();
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return current state
        return this.getState();
      }
      console.error('Failed to load state:', error.message);
      throw error;
    }
  }

  /**
   * Acquire file lock for concurrent access prevention
   */
  private async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        await fs.writeFile(this.lockFilePath, process.pid.toString(), { flag: 'wx' });
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        } else {
          throw error;
        }
      }
    }

    throw new Error('Failed to acquire lock after maximum attempts');
  }

  /**
   * Release file lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFilePath);
    } catch (error: any) {
      // Ignore errors if lock file doesn't exist
      if (error.code !== 'ENOENT') {
        console.error('Failed to release lock:', error.message);
      }
    }
  }

  /**
   * Get audit trail
   */
  getAuditTrail(): AuditEntry[] {
    return [...this.state.auditTrail];
  }
}
