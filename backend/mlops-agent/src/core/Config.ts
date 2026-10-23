import * as fs from 'fs/promises';
import * as path from 'path';

export interface MLOpsAgentConfig {
  llm: {
    provider: 'openrouter';
    apiKey: string;
    model: string;
    temperature: number;
  };
  cicd: {
    platform: 'github' | 'gitlab' | 'both';
    templateDir?: string;
  };
  docker: {
    defaultPythonVersion: string;
    baseImageRegistry?: string;
  };
  output: {
    scaffoldDir: string;
    zipOutputDir: string;
  };
}

export class ConfigManager {
  private config: MLOpsAgentConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Load configuration
   */
  async loadConfig(configPath?: string): Promise<MLOpsAgentConfig> {
    let config = this.getDefaultConfig();

    if (configPath) {
      try {
        const fileConfig = await this.loadConfigFile(configPath);
        config = this.mergeConfig(config, fileConfig);
      } catch (error: any) {
        console.warn(`Failed to load config file: ${error.message}`);
      }
    }

    config = this.loadFromEnvironment(config);
    this.validateConfig(config);
    this.config = config;
    return config;
  }

  /**
   * Get current configuration
   */
  getConfig(): MLOpsAgentConfig {
    return { ...this.config };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): MLOpsAgentConfig {
    return {
      llm: {
        provider: 'openrouter',
        apiKey: '',
        model: 'mistralai/devstral-2512:free',
        temperature: 0.7,
      },
      cicd: {
        platform: 'both',
      },
      docker: {
        defaultPythonVersion: '3.11',
      },
      output: {
        scaffoldDir: './scaffold',
        zipOutputDir: '.',
      },
    };
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(configPath: string): Promise<Partial<MLOpsAgentConfig>> {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(config: MLOpsAgentConfig): MLOpsAgentConfig {
    const envConfig = { ...config };

    // LLM configuration
    if (process.env.OPENROUTER_API_KEY) {
      envConfig.llm.apiKey = process.env.OPENROUTER_API_KEY;
    }

    if (process.env.LLM_MODEL) {
      envConfig.llm.model = process.env.LLM_MODEL;
    }

    if (process.env.LLM_TEMPERATURE) {
      envConfig.llm.temperature = parseFloat(process.env.LLM_TEMPERATURE);
    }

    // CI/CD configuration
    if (process.env.CICD_PLATFORM) {
      envConfig.cicd.platform = process.env.CICD_PLATFORM as 'github' | 'gitlab' | 'both';
    }

    if (process.env.TEMPLATE_DIR) {
      envConfig.cicd.templateDir = process.env.TEMPLATE_DIR;
    }

    // Docker configuration
    if (process.env.PYTHON_VERSION) {
      envConfig.docker.defaultPythonVersion = process.env.PYTHON_VERSION;
    }

    if (process.env.DOCKER_REGISTRY) {
      envConfig.docker.baseImageRegistry = process.env.DOCKER_REGISTRY;
    }

    // Output configuration
    if (process.env.SCAFFOLD_DIR) {
      envConfig.output.scaffoldDir = process.env.SCAFFOLD_DIR;
    }

    if (process.env.ZIP_OUTPUT_DIR) {
      envConfig.output.zipOutputDir = process.env.ZIP_OUTPUT_DIR;
    }

    return envConfig;
  }

  /**
   * Merge two configurations
   */
  private mergeConfig(
    base: MLOpsAgentConfig,
    override: Partial<MLOpsAgentConfig>
  ): MLOpsAgentConfig {
    return {
      llm: { ...base.llm, ...override.llm },
      cicd: { ...base.cicd, ...override.cicd },
      docker: { ...base.docker, ...override.docker },
      output: { ...base.output, ...override.output },
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: MLOpsAgentConfig): void {
    // Validate API key
    if (!config.llm.apiKey) {
      throw new Error(
        'OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or provide in config file.'
      );
    }

    // Validate temperature
    if (config.llm.temperature < 0 || config.llm.temperature > 2) {
      throw new Error('LLM temperature must be between 0 and 2');
    }

    // Validate CI/CD platform
    const validPlatforms = ['github', 'gitlab', 'both'];
    if (!validPlatforms.includes(config.cicd.platform)) {
      throw new Error(`Invalid CI/CD platform: ${config.cicd.platform}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(configPath: string): Promise<void> {
    const content = JSON.stringify(this.config, null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
  }
}
