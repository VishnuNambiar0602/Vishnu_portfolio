import { describe, it, expect } from 'vitest';
import { DependencyAgent } from '../src/agents/DependencyAgent.js';

// The agent only needs the LLM provider for optional enrichment; analysis itself is deterministic.
const agent = new DependencyAgent(null as any);

describe('DependencyAgent', () => {
  it('separates standard library from external packages', async () => {
    const result = await agent.analyzeDependencies('import os\nimport platform\nimport numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\n');
    expect(result.standardLibrary).toEqual(expect.arrayContaining(['os', 'platform']));
    expect(result.externalPackages).toEqual(['numpy', 'sklearn']);
  });

  it('writes PyPI names, not import names, to requirements.txt', () => {
    const text = agent.generateRequirements({
      standardLibrary: [],
      externalPackages: ['sklearn', 'cv2', 'numpy', 'sklearn'],
      conditionalImports: [],
    });
    const lines = text.split('\n');
    expect(lines).toContain('scikit-learn');
    expect(lines).toContain('opencv-python');
    expect(lines).not.toContain('sklearn');
    expect(lines.filter(l => l === 'scikit-learn')).toHaveLength(1);
  });
});
