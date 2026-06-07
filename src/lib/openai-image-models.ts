export const openAiImageModels = ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'] as const;

export type OpenAiImageModel = (typeof openAiImageModels)[number];

export const openAiImageModelLabels: Record<OpenAiImageModel, string> = {
  'gpt-image-1': 'GPT Image 1',
  'gpt-image-1-mini': 'GPT Image 1 Mini',
  'gpt-image-2': 'GPT Image 2',
};
