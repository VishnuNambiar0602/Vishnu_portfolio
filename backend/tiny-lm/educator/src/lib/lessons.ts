// Lesson registry for Tiny LM Educator

export interface Lesson {
  id: string;
  title: string;
  order: number;
  sourceFile: string;
  annotationsFile: string;
  contentFile: string;
  diagramComponent?: string;
}

export const lessons: Lesson[] = [
  {
    id: "intro",
    title: "Introduction & Architecture Overview",
    order: 1,
    sourceFile: "tiny_lm/model.py",
    annotationsFile: "src/content/annotations/model.annotations.json",
    contentFile: "src/content/intro.mdx",
    diagramComponent: "ArchitectureDiagram",
  },
  {
    id: "tokenizer",
    title: "Tokenizer",
    order: 2,
    sourceFile: "tiny_lm/tokenizer.py",
    annotationsFile: "src/content/annotations/tokenizer.annotations.json",
    contentFile: "src/content/tokenizer.mdx",
  },
  {
    id: "embeddings",
    title: "Embeddings & Positional Encoding",
    order: 3,
    sourceFile: "tiny_lm/embeddings.py",
    annotationsFile: "src/content/annotations/embeddings.annotations.json",
    contentFile: "src/content/embeddings.mdx",
  },
  {
    id: "attention-sdp",
    title: "Scaled Dot-Product Attention",
    order: 4,
    sourceFile: "tiny_lm/attention.py",
    annotationsFile: "src/content/annotations/attention.annotations.json",
    contentFile: "src/content/attention-sdp.mdx",
  },
  {
    id: "attention-mha",
    title: "Multi-Head Attention",
    order: 5,
    sourceFile: "tiny_lm/attention.py",
    annotationsFile: "src/content/annotations/attention.annotations.json",
    contentFile: "src/content/attention-mha.mdx",
    diagramComponent: "AttentionHeatmap",
  },
  {
    id: "ffn",
    title: "Feed-Forward Network",
    order: 6,
    sourceFile: "tiny_lm/ffn.py",
    annotationsFile: "src/content/annotations/ffn.annotations.json",
    contentFile: "src/content/ffn.mdx",
  },
  {
    id: "transformer-block",
    title: "Transformer Block",
    order: 7,
    sourceFile: "tiny_lm/transformer_block.py",
    annotationsFile: "src/content/annotations/transformer_block.annotations.json",
    contentFile: "src/content/transformer-block.mdx",
    diagramComponent: "ResidualStreamDiagram",
  },
  {
    id: "model-assembly",
    title: "Full Model Assembly",
    order: 8,
    sourceFile: "tiny_lm/model.py",
    annotationsFile: "src/content/annotations/model.annotations.json",
    contentFile: "src/content/model-assembly.mdx",
  },
  {
    id: "training-loop",
    title: "Training Loop",
    order: 9,
    sourceFile: "tiny_lm/train.py",
    annotationsFile: "src/content/annotations/train.annotations.json",
    contentFile: "src/content/training-loop.mdx",
  },
  {
    id: "inference",
    title: "Inference & Text Generation",
    order: 10,
    sourceFile: "tiny_lm/inference.py",
    annotationsFile: "src/content/annotations/inference.annotations.json",
    contentFile: "src/content/inference.mdx",
  },
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
