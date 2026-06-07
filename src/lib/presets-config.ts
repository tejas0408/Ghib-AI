export const generationStyles = ['anime', 'clay', 'marble', 'pixel', 'storybook'] as const;
export type GenerationStyle = (typeof generationStyles)[number];

export interface StylePreset {
  style: GenerationStyle;
  id: GenerationStyle;
  name: string;
  description: string;
  systemPrompt: string;
  transformationPrompt: (focus: string) => string;
  negativePrompt: string;
  qualityInstructions: string;
  parameters: {
    quality: 'low' | 'medium' | 'high' | 'auto';
    model: 'gpt-image-1' | 'gpt-image-1-mini' | 'gpt-image-2';
    style: 'vivid' | 'natural';
  };
}

export const PRESETS_REGISTRY: Record<GenerationStyle, StylePreset> = {
  anime: {
    id: 'anime',
    style: 'anime',
    name: 'Anime Cel',
    description: 'Clean cel shading with expressive colors and crisp outlines.',
    systemPrompt:
      'You are an expert anime background and character illustrator producing polished studio keyframes.',
    transformationPrompt: (focus) =>
      `Restyle the uploaded image as high-end anime cel art. Subject focus: ${focus}. Maintain the exact same camera framing, camera perspective, lighting source, subject proportions, subject pose, clothing style, and background environment. Do not alter the scene layout or add new characters.`,
    negativePrompt:
      'photorealistic, 3d render, extra limbs, distorted face, duplicate people, random objects, hallucinated accessories, identity drift, composition changes, camera angle drift, generic textures.',
    qualityInstructions:
      'Vibrant color contrast, clean ink outlines, elegant cel shading, high definition anime production style.',
    parameters: { quality: 'high', model: 'gpt-image-1', style: 'natural' },
  },
  clay: {
    id: 'clay',
    style: 'clay',
    name: 'Clay Render',
    description: 'Handcrafted clay texture with sculpted forms and warm depth.',
    systemPrompt:
      'You are a claymation lighting artist and digital sculptor focused on realistic handcrafted clay materials.',
    transformationPrompt: (focus) =>
      `Translate the uploaded image into a physical claymation scene. Subject focus: ${focus}. Preserve the exact subject pose, identity, face, composition, clothing, and background structure. Make all objects and surfaces look as though they are sculpted out of colorful modeling clay.`,
    negativePrompt:
      'photorealistic, digital painting, line art, sharp edges, extra limbs, duplicate people, random objects, hallucinated details, facial drift, background modification, transparent objects.',
    qualityInstructions:
      'Subtle plasticine fingerprints, soft ambient occlusion, realistic clay texture, warm premium studio lighting.',
    parameters: { quality: 'medium', model: 'gpt-image-1', style: 'vivid' },
  },
  marble: {
    id: 'marble',
    style: 'marble',
    name: 'Marble Sculpture',
    description: 'Elegant carved-stone portraiture with refined texture and museum lighting.',
    systemPrompt:
      'You are a classical sculpture art director translating physical scenes into museum-grade carved stone.',
    transformationPrompt: (focus) =>
      `Translate the uploaded image into an elegant carved marble sculpture. Subject focus: ${focus}. Retain the exact camera perspective, facial anatomy, clothing drapery, pose, and background layout. Render every element in white chiseled marble with stone textures.`,
    negativePrompt:
      'colors, paint, line art, plastic look, extra limbs, distorted features, added people, hallucinated accessories, identity change, camera movement.',
    qualityInstructions:
      'Chiseled detail, subtle surface veining, soft museum-style lighting, high-resolution stone texture, premium gallery finish.',
    parameters: { quality: 'high', model: 'gpt-image-1', style: 'natural' },
  },
  pixel: {
    id: 'pixel',
    style: 'pixel',
    name: 'Pixel Art',
    description: 'Blocky pixel-crafted depth with bright game-like lighting.',
    systemPrompt:
      'You are a senior pixel-art and voxel-art director creating highly readable stylized retro game assets.',
    transformationPrompt: (focus) =>
      `Convert the uploaded image into a high-fidelity pixel art scene. Subject focus: ${focus}. Preserve the subject identity, pose, clothing style, framing, and environment layout. Map the shapes, outlines, and lighting onto a clean pixel grid.`,
    negativePrompt:
      'smooth gradients, blurry lines, photorealism, high-poly 3d, extra limbs, distorted faces, random objects, identity drift.',
    qualityInstructions:
      'Crisp block forms, simplified geometry, readable silhouettes, bright game-like lighting, authentic pixel depth.',
    parameters: { quality: 'medium', model: 'gpt-image-1', style: 'vivid' },
  },
  storybook: {
    id: 'storybook',
    style: 'storybook',
    name: 'Storybook Illustration',
    description: 'Soft cinematic lighting with polished 3D storybook detail.',
    systemPrompt:
      'You are an animated feature art director creating warm, refined storybook frames.',
    transformationPrompt: (focus) =>
      `Transform the uploaded image into a premium storybook-inspired 3D illustration. Subject focus: ${focus}. Preserve the original subject identity, pose, clothing details, and background layout. Apply soft hand-painted textures, warm cinematic lighting, and polished animated-film rendering.`,
    negativePrompt:
      'harsh lighting, photorealism, extra limbs, distorted faces, random accessories, duplicate people, scene changes, camera angle drift.',
    qualityInstructions:
      'Soft depth, tactile materials, warm cinematic lighting, accurate facial features, clean digital painting edges.',
    parameters: { quality: 'high', model: 'gpt-image-1', style: 'natural' },
  },
};

export const STYLES_REGISTRY = PRESETS_REGISTRY;
export const STYLE_TO_PRESET_SLUG: Record<GenerationStyle, GenerationStyle> = {
  anime: 'anime',
  clay: 'clay',
  marble: 'marble',
  pixel: 'pixel',
  storybook: 'storybook',
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
  return PRESETS_REGISTRY[STYLE_TO_PRESET_SLUG[style]];
}

export function buildPromptForStyle(style: GenerationStyle, userInput?: string) {
  const preset = getPromptPresetByStyle(style);
  const promptInput = sanitizePromptInput(userInput);

  return {
    preset,
    prompt: [
      preset.systemPrompt,
      preset.transformationPrompt(promptInput),
      `Negative prompt: ${preset.negativePrompt}`,
      `Quality instructions: ${preset.qualityInstructions}`,
    ].join('\n\n'),
  };
}
