export interface AIImageModel {
  id: string;
  label: string;
  resolutionOptions: string[];
  defaultResolution: string;
}

export interface AIImageProvider {
  id: string;
  name: string;
  models: AIImageModel[];
}

export const DEFAULT_PROVIDER_ID = 'openai';
export const DEFAULT_IMAGE_MODEL_ID = 'gpt-image-1';

export const PROVIDERS_REGISTRY: Record<string, AIImageProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: [
      {
        id: 'gpt-image-1',
        label: 'GPT Image 1',
        resolutionOptions: ['1024x1024', '1024x1536', '1536x1024'],
        defaultResolution: '1024x1024',
      },
      {
        id: 'gpt-image-1-mini',
        label: 'GPT Image 1 Mini',
        resolutionOptions: ['1024x1024', '1024x1536', '1536x1024'],
        defaultResolution: '1024x1024',
      },
      {
        id: 'gpt-image-2',
        label: 'GPT Image 2',
        resolutionOptions: ['1024x1024', '1024x1536', '1536x1024'],
        defaultResolution: '1024x1024',
      },
    ],
  },
  replicate: {
    id: 'replicate',
    name: 'Replicate',
    models: [
      {
        id: 'black-forest-labs/flux-schnell',
        label: 'Flux Schnell',
        resolutionOptions: ['1024x1024'],
        defaultResolution: '1024x1024',
      },
    ],
  },
};

export function getProviderConfig(providerId = DEFAULT_PROVIDER_ID) {
  return PROVIDERS_REGISTRY[providerId] ?? PROVIDERS_REGISTRY[DEFAULT_PROVIDER_ID];
}

export function getModelConfig(providerId = DEFAULT_PROVIDER_ID, modelId = DEFAULT_IMAGE_MODEL_ID) {
  const provider = getProviderConfig(providerId);
  return provider.models.find((model) => model.id === modelId) ?? provider.models[0];
}
