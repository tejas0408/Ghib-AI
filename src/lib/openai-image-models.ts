export const openAiImageModels = ['dall-e-3', 'dall-e-2'] as const;

export type OpenAiImageModel = (typeof openAiImageModels)[number];

export const openAiImageModelLabels: Record<OpenAiImageModel, string> = {
  'dall-e-3': 'DALL-E 3',
  'dall-e-2': 'DALL-E 2',
};
