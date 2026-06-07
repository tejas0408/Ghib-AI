import { z } from 'zod';
import { generationStatusValues } from '@/db/schema';
import { openAiImageModels } from '@/lib/openai-image-models';
import { generationStyles } from '@/lib/presets-config';

export const generateImageSchema = z.object({
  sourceImage: z.string().url('Source image must be a valid URL.'),
  sourceImageFileId: z.string().min(1).max(200).optional(),
  style: z.enum(generationStyles),
  modelId: z.enum(openAiImageModels).default('dall-e-3'),
  focus: z.string().max(500).optional(),
  promptInput: z.string().max(500).optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(60).default(10),
  cursor: z.string().datetime().optional(),
  style: z.enum(generationStyles).optional(),
  status: z.enum(generationStatusValues).optional(),
});

export const downloadQuerySchema = z.object({
  url: z.string().url('Download URL must be a valid URL.'),
});

export const deleteGenerationSchema = z.object({
  generationId: z.string().min(1, 'Generation id is required.'),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;

export interface GenerationMetadata {
  width: number | null;
  height: number | null;
  fileSize: number | null;
  duration: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
