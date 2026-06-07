import { randomUUID } from 'crypto';
import { and, count, desc, eq, gt, lt, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { generations, type GenerationParameters, type GenerationStatus } from '@/db/schema';
import {
  DEFAULT_IMAGE_MODEL_ID,
  DEFAULT_PROVIDER_ID,
  getModelConfig,
  getProviderConfig,
} from '@/lib/providers-registry';
import {
  buildPromptForStyle,
  type GenerationStyle,
} from '@/lib/presets-config';
import {
  buildImageKitThumbnailUrl,
  deleteImageKitFiles,
  isImageKitUrl,
  isImageKitConfigured,
  uploadRemoteImageToImageKit,
} from '@/lib/imagekit';

const OPENAI_IMAGE_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_TIMEOUT_MS = 30_000;
const DEFAULT_HISTORY_LIMIT = 60;
const MAX_HISTORY_LIMIT = 100;
const GENERATION_RATE_LIMIT = 3;
const GENERATION_RATE_LIMIT_WINDOW_MS = 60_000;

type GenerationRow = typeof generations.$inferSelect;

interface RunGenerationParams {
  userId: string;
  sourceImage: string;
  sourceImageFileId?: string;
  style: GenerationStyle;
  promptInput?: string;
  providerId?: string;
  modelId?: string;
}

interface OpenAIImageResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
  };
}

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
}

function parseResolution(resolution: string) {
  const [width, height] = resolution.split('x').map((part) => Number.parseInt(part, 10));

  return {
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown generation error.';
}

async function requestOpenAIImage(params: {
  prompt: string;
  modelId: string;
  size: string;
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
}) {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model: params.modelId,
      prompt: params.prompt,
      n: 1,
      size: params.size,
      response_format: 'url',
    };

    if (params.modelId === 'dall-e-3') {
      body.quality = params.quality;
      body.style = params.style;
    }

    const response = await fetch(OPENAI_IMAGE_GENERATIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-App-Source': 'Ghib-AI',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => ({}))) as OpenAIImageResponse;

    if (!response.ok) {
      throw new Error(json.error?.message ?? `OpenAI image generation failed with ${response.status}.`);
    }

    const image = json.data?.[0];

    if (image?.url) {
      return image.url;
    }

    if (image?.b64_json) {
      return `data:image/png;base64,${image.b64_json}`;
    }

    throw new Error('OpenAI did not return an image URL.');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runProviderImageGeneration(params: {
  prompt: string;
  providerId: string;
  modelId: string;
  size: string;
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
}) {
  if (params.providerId !== 'openai') {
    throw new Error(`Provider "${params.providerId}" is registered but not implemented yet.`);
  }

  return requestOpenAIImage({
    prompt: params.prompt,
    modelId: params.modelId,
    size: params.size,
    quality: params.quality,
    style: params.style,
  });
}

export async function runGenerationPipeline(params: RunGenerationParams) {
  const provider = getProviderConfig(params.providerId ?? DEFAULT_PROVIDER_ID);
  const model = getModelConfig(provider.id, params.modelId ?? DEFAULT_IMAGE_MODEL_ID);
  const { preset, prompt } = buildPromptForStyle(params.style, params.promptInput);
  const generationId = `gen_${randomUUID()}`;
  const { width, height } = parseResolution(model.defaultResolution);

  const initialParameters: GenerationParameters = {
    ...preset.parameters,
    sourceImageUrl: params.sourceImage,
    providerName: provider.name,
    resolution: model.defaultResolution,
  };

  await db.insert(generations).values({
    id: generationId,
    userId: params.userId,
    originalImageUrl: params.sourceImage,
    style: params.style,
    preset: preset.slug,
    promptUsed: prompt,
    model: model.id,
    provider: provider.id,
    generationStatus: 'pending',
    parameters: initialParameters,
  });

  try {
    await db
      .update(generations)
      .set({ generationStatus: 'processing', updatedAt: new Date() })
      .where(eq(generations.id, generationId));

    let workingParameters = initialParameters;

    if (isImageKitConfigured()) {
      const originalUpload = await uploadRemoteImageToImageKit({
        imageUrl: params.sourceImage,
        userId: params.userId,
        folderKind: 'originals',
        fileName: `${generationId}-original.png`,
      });

      workingParameters = {
        ...workingParameters,
        sourceProviderImageUrl: params.sourceImage,
        imageKitOriginalFileId: originalUpload.fileId,
        originalFileSize: originalUpload.fileSize,
      };

      await db
        .update(generations)
        .set({
          originalImageUrl: originalUpload.url,
          parameters: workingParameters,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, generationId));
    }

    const startedAt = Date.now();
    const providerImageUrl = await runProviderImageGeneration({
      prompt,
      providerId: provider.id,
      modelId: model.id,
      size: model.defaultResolution,
      quality: preset.parameters.quality,
    });

    let generatedImageUrl = providerImageUrl;
    let fileSize: number | null = null;
    const completedParameters: GenerationParameters = {
      ...workingParameters,
      providerImageUrl,
    };

    if (isImageKitConfigured()) {
      const uploaded = await uploadRemoteImageToImageKit({
        imageUrl: providerImageUrl,
        userId: params.userId,
        folderKind: 'generated',
        fileName: `${generationId}.png`,
      });

      generatedImageUrl = uploaded.url;
      fileSize = uploaded.fileSize;
      completedParameters.imageKitGeneratedFileId = uploaded.fileId;
    }

    const [generation] = await db
      .update(generations)
      .set({
        generatedImageUrl,
        generationStatus: 'completed',
        generationTime: Date.now() - startedAt,
        imageWidth: width,
        imageHeight: height,
        fileSize,
        parameters: completedParameters,
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generationId))
      .returning();

    return generation;
  } catch (error) {
    await db
      .update(generations)
      .set({
        generationStatus: 'failed',
        errorMessage: errorMessage(error),
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generationId));

    throw error;
  }
}

export async function getUserGenerationHistory(params: {
  userId: string;
  limit?: number;
  cursorCreatedAt?: Date;
}) {
  const limit = Math.min(params.limit ?? DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
  const where = params.cursorCreatedAt
    ? and(eq(generations.userId, params.userId), lt(generations.createdAt, params.cursorCreatedAt))
    : eq(generations.userId, params.userId);

  return db.query.generations.findMany({
    where,
    orderBy: desc(generations.createdAt),
    limit,
  });
}

export async function getRecentGenerationStats(userId: string) {
  const rows = await getUserGenerationHistory({ userId, limit: 5 });

  return {
    recentRows: rows,
    recentStyleCount: new Set(rows.map((generation: GenerationRow) => generation.style)).size,
  };
}
