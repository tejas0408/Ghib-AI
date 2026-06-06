export const generationStyles = ['anime', 'clay', 'marble', 'pixel', 'storybook'] as const;
export type GenerationStyle = (typeof generationStyles)[number];

export interface PromptPreset {
  slug: string;
  style: GenerationStyle;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: (userInput: string) => string;
  parameters: {
    quality: 'standard' | 'hd';
    styleWeight: number;
    steps?: number;
  };
}

const compositionGuardrail =
  'Keep the original subject identity, pose, framing, scene layout, clothing, major objects, and camera angle intact.';

export const STYLES_REGISTRY: Record<string, PromptPreset> = {
  'anime-cel': {
    slug: 'anime-cel',
    style: 'anime',
    name: 'Anime Cel',
    description: 'Clean cel shading with expressive color and crisp outlines.',
    systemPrompt:
      'You are an expert anime background and character illustrator producing polished studio keyframes.',
    userPromptTemplate: (input) =>
      `Restyle the uploaded image as high-end anime cel art. Subject focus: ${input}. ${compositionGuardrail} Use crisp ink lines, elegant cel shading, and vibrant color contrast.`,
    parameters: { quality: 'hd', styleWeight: 0.9 },
  },
  'clay-render': {
    slug: 'clay-render',
    style: 'clay',
    name: 'Clay Render',
    description: 'Handcrafted clay texture with sculpted forms and warm depth.',
    systemPrompt:
      'You are a claymation lighting artist and digital sculptor focused on realistic handcrafted materials.',
    userPromptTemplate: (input) =>
      `Transform the image into a physical clay model. Subject focus: ${input}. ${compositionGuardrail} Use sculpted forms, warm ambient lighting, soft depth of field, and subtle plasticine fingerprints.`,
    parameters: { quality: 'standard', styleWeight: 0.85 },
  },
  'marble-sculpture': {
    slug: 'marble-sculpture',
    style: 'marble',
    name: 'Marble Sculpture',
    description: 'Elegant carved-stone portraiture with refined texture and museum lighting.',
    systemPrompt:
      'You are a classical sculpture art director translating scenes into refined carved stone.',
    userPromptTemplate: (input) =>
      `Translate the image into an elegant marble sculpture. Subject focus: ${input}. ${compositionGuardrail} Use carved stone detail, subtle veining, museum lighting, and gallery-grade finish.`,
    parameters: { quality: 'hd', styleWeight: 0.88 },
  },
  pixelart: {
    slug: 'pixelart',
    style: 'pixel',
    name: 'Pixel Art',
    description: 'Blocky pixel-crafted depth with bright game-like lighting.',
    systemPrompt:
      'You are a senior pixel-art and voxel-art director creating readable stylized game assets.',
    userPromptTemplate: (input) =>
      `Convert the image into polished pixel-inspired artwork. Subject focus: ${input}. ${compositionGuardrail} Use crisp block forms, simplified geometry, readable silhouettes, and bright game-like lighting.`,
    parameters: { quality: 'standard', styleWeight: 0.8, steps: 28 },
  },
  'storybook-3d': {
    slug: 'storybook-3d',
    style: 'storybook',
    name: 'Storybook 3D',
    description: 'Soft cinematic lighting with polished 3D storybook detail.',
    systemPrompt:
      'You are an animated feature art director creating warm, refined storybook frames.',
    userPromptTemplate: (input) =>
      `Transform the image into a premium storybook-inspired 3D illustration. Subject focus: ${input}. ${compositionGuardrail} Use soft depth, tactile materials, warm cinematic lighting, and polished animated-film rendering.`,
    parameters: { quality: 'hd', styleWeight: 0.86 },
  },
};

export const STYLE_TO_PRESET_SLUG: Record<GenerationStyle, keyof typeof STYLES_REGISTRY> = {
  anime: 'anime-cel',
  clay: 'clay-render',
  marble: 'marble-sculpture',
  pixel: 'pixelart',
  storybook: 'storybook-3d',
};

const promptGuardPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /system\s+prompt/gi,
  /developer\s+message/gi,
  /output\s+json/gi,
  /jailbreak/gi,
];

export function sanitizePromptInput(input?: string) {
  let sanitized = (input ?? 'the visible subject and scene')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  for (const pattern of promptGuardPatterns) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }

  return sanitized || 'the visible subject and scene';
}

export function getPromptPresetByStyle(style: GenerationStyle) {
  return STYLES_REGISTRY[STYLE_TO_PRESET_SLUG[style]];
}

export function buildPromptForStyle(style: GenerationStyle, userInput?: string) {
  const preset = getPromptPresetByStyle(style);
  const promptInput = sanitizePromptInput(userInput);

  return {
    preset,
    prompt: `${preset.systemPrompt}\n\n${preset.userPromptTemplate(promptInput)}`,
  };
}
