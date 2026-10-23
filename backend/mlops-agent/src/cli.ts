#!/usr/bin/env node

import 'dotenv/config';
import { LLMProvider } from './core/LLMProvider.js';
import { FileValidator } from './core/FileValidator.js';
import { ScaffoldBuilder } from './core/ScaffoldBuilder.js';
import { ZipPackager } from './core/ZipPackager.js';
import { SupervisorAgent } from './agents/SupervisorAgent.js';
import * as path from 'path';
import * as fs from 'fs/promises';

interface CLIOptions {
  inputFile: string;
  cicdPlatform?: 'github' | 'gitlab' | 'both';
  templateDir?: string;
  projectName?: string;
}

async function main() {
  console.log('MLOps Automation Agent\n');

  const options = parseArguments();

  if (!options.inputFile) {
    console.error('Error: Input file path is required');
    console.log('\nUsage: mlops-agent <input-file.py> [options]');
    console.log('\nOptions:');
    console.log('  --cicd <platform>     CI/CD platform (github|gitlab|both) [default: both]');
    console.log('  --template <dir>      Custom template directory');
    console.log('  --project <name>      Project name [default: mlops-project]');
    process.exit(1);
  }

  try {
    console.log('Validating input file...');
    const validator = new FileValidator();
    const validation = await validator.validateFile(options.inputFile);

    if (!validation.valid) {
      console.error(`Validation failed: ${validation.error}`);
      process.exit(1);
    }

    console.log('Input file validated\n');

    console.log('Connecting to LLM provider...');
    const llmProvider = new LLMProvider();
    console.log('Connected to OpenRouter\n');

    console.log('Starting MLOps workflow...\n');
    const supervisor = new SupervisorAgent(llmProvider, options.inputFile);
    const result = await supervisor.processModelFile(options.inputFile);

    if (!result.success) {
      console.error(`\nWorkflow failed: ${result.error?.message}`);
      process.exit(1);
    }

    console.log('\nAll agents completed successfully\n');

    console.log('Building scaffold structure...');
    const projectName = options.projectName || 'mlops-project';
    const buildsDir = path.join(process.cwd(), 'builds');
    
    await fs.mkdir(buildsDir, { recursive: true });
    const scaffoldBuilder = new ScaffoldBuilder(projectName, buildsDir);
    
    await scaffoldBuilder.createStructure();
    await scaffoldBuilder.placeFiles(result.generatedFiles);
    await scaffoldBuilder.copyInputFile(options.inputFile);

    const gitignore = scaffoldBuilder.generateGitignore();
    await scaffoldBuilder.placeFiles([
      {
        path: '.gitignore',
        content: gitignore,
        purpose: 'Git ignore patterns',
      },
    ]);

    const summary = await scaffoldBuilder.generateSummary(result.generatedFiles);
    await scaffoldBuilder.placeFiles([
      {
        path: 'SCAFFOLD_SUMMARY.md',
        content: summary,
        purpose: 'Scaffold generation summary',
      },
    ]);

    console.log('Scaffold structure created\n');

    console.log('Creating zip archive...');
    const zipPackager = new ZipPackager();
    const zipPath = await zipPackager.createZipArchive(
      scaffoldBuilder.getRootDir(),
      projectName
    );

    console.log(`\nZip archive created: ${zipPath}\n`);

    console.log('Summary:');
    console.log(`   Generated files: ${result.generatedFiles.length}`);
    console.log(`   Scaffold location: ${scaffoldBuilder.getRootDir()}`);
    console.log(`   Zip archive: ${zipPath}`);
    console.log('\nMLOps scaffold generation complete!\n');

    console.log('Next steps:');
    console.log('  1. Extract the zip file or navigate to the scaffold directory');
    console.log('  2. Review the generated files');
    console.log('  3. Initialize Git: git init');
    console.log('  4. Commit and push to your repository');
    console.log('  5. Configure CI/CD secrets and deployment targets\n');

  } catch (error: any) {
    console.error(`\nError: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    inputFile: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--cicd' && i + 1 < args.length) {
      options.cicdPlatform = args[++i] as 'github' | 'gitlab' | 'both';
    } else if (arg === '--template' && i + 1 < args.length) {
      options.templateDir = args[++i];
    } else if (arg === '--project' && i + 1 < args.length) {
      options.projectName = args[++i];
    } else if (!arg.startsWith('--')) {
      options.inputFile = arg;
    }
  }

  return options;
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
