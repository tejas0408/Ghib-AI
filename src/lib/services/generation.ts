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
  uploadBufferToImageKit,
  uploadRemoteImageToImageKit,
} from '@/lib/imagekit';

const OPENAI_IMAGE_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_EDITS_URL = 'https://api.openai.com/v1/images/edits';
const OPENAI_TIMEOUT_MS = 90_000;
const MAX_OPENAI_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
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

interface ProviderImageResult {
  url: string;
  buffer?: Buffer;
  mimeType?: string;
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

function fileExtensionForContentType(contentType: string) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

function normalizeContentType(contentType: string | null) {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
  return normalized?.startsWith('image/') ? normalized : 'image/png';
}

async function downloadSourceImage(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Unable to download source image for editing: ${response.status}.`);
  }

  const contentType = normalizeContentType(response.headers.get('content-type'));
  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength === 0) {
    throw new Error('Source image download returned an empty file.');
  }

  if (buffer.byteLength > MAX_OPENAI_SOURCE_IMAGE_BYTES) {
    throw new Error('Source image is too large for OpenAI image editing.');
  }

  return {
    buffer,
    contentType,
    fileName: `source.${fileExtensionForContentType(contentType)}`,
  };
}

function appendImageFile(formData: FormData, fieldName: string, image: Awaited<ReturnType<typeof downloadSourceImage>>) {
  const blob = new Blob([new Uint8Array(image.buffer)], { type: image.contentType });
  formData.append(fieldName, blob, image.fileName);
}

function imageResultFromResponse(json: OpenAIImageResponse, fallbackMimeType = 'image/png'): ProviderImageResult {
  const image = json.data?.[0];

  if (image?.url) {
    return { url: image.url };
  }

  if (image?.b64_json) {
    const buffer = Buffer.from(image.b64_json, 'base64');
    return {
      url: `data:${fallbackMimeType};base64,${image.b64_json}`,
      buffer,
      mimeType: fallbackMimeType,
    };
  }

  throw new Error('OpenAI did not return an image.');
}

async function requestOpenAIImage(params: {
  prompt: string;
  modelId: string;
  size: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
}): Promise<ProviderImageResult> {
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
      quality: params.quality,
      output_format: 'png',
    };

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

    return imageResultFromResponse(json);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestOpenAIImageEdit(params: {
  prompt: string;
  sourceImageUrl: string;
  modelId: string;
  size: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
}): Promise<ProviderImageResult> {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.');
  }

  const sourceImage = await downloadSourceImage(params.sourceImageUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const formData = new FormData();

    formData.append('model', params.modelId);
    formData.append('prompt', params.prompt);
    formData.append('n', '1');
    formData.append('size', params.size);
    formData.append('quality', params.quality);
    formData.append('output_format', 'png');
    appendImageFile(formData, 'image[]', sourceImage);

    const response = await fetch(OPENAI_IMAGE_EDITS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-App-Source': 'Ghib-AI',
      },
      body: formData,
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => ({}))) as OpenAIImageResponse;

    if (!response.ok) {
      throw new Error(json.error?.message ?? `OpenAI image edit failed with ${response.status}.`);
    }

    return imageResultFromResponse(json);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runProviderImageGeneration(params: {
  prompt: string;
  providerId: string;
  modelId: string;
  size: string;
  quality: 'low' | 'medium' | 'high' | 'auto';
  style: 'vivid' | 'natural';
  sourceImageUrl?: string;
}): Promise<ProviderImageResult> {
  if (params.providerId !== 'openai') {
    throw new Error(`Provider "${params.providerId}" is registered but not implemented yet.`);
  }

  if (params.sourceImageUrl) {
    return requestOpenAIImageEdit({
      prompt: params.prompt,
      sourceImageUrl: params.sourceImageUrl,
      modelId: params.modelId,
      size: params.size,
      quality: params.quality,
    });
  }

  return requestOpenAIImage({
    prompt: params.prompt,
    modelId: params.modelId,
    size: params.size,
    quality: params.quality,
  });
}

export async function runGenerationPipeline(params: RunGenerationParams) {
  const provider = getProviderConfig(params.providerId ?? DEFAULT_PROVIDER_ID);
  const { preset, prompt } = buildPromptForStyle(params.style, params.promptInput);
  const model = getModelConfig(provider.id, params.modelId ?? preset.parameters.model ?? DEFAULT_IMAGE_MODEL_ID);
  const generationId = `gen_${randomUUID()}`;
  const { width, height } = parseResolution(model.defaultResolution);

  const initialParameters: GenerationParameters = {
    ...preset.parameters,
    requestedModelId: params.modelId ?? null,
    sourceImageUrl: params.sourceImage,
    sourceProviderImageUrl: params.sourceImage,
    providerName: provider.name,
    resolution: model.defaultResolution,
  };

  if (params.sourceImageFileId) {
    initialParameters.imageKitOriginalFileId = params.sourceImageFileId;
  }

  await db.insert(generations).values({
    id: generationId,
    userId: params.userId,
    originalImageUrl: params.sourceImage,
    style: params.style,
    preset: preset.id,
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
    let sourceImageForProvider = params.sourceImage;

    if (isImageKitConfigured() && (!params.sourceImageFileId || !isImageKitUrl(params.sourceImage))) {
      const originalUpload = await uploadRemoteImageToImageKit({
        imageUrl: params.sourceImage,
        userId: params.userId,
        folderKind: 'originals',
        fileName: `${generationId}-original.png`,
      });

      workingParameters = {
        ...workingParameters,
        sourceProviderImageUrl: originalUpload.url,
        imageKitOriginalFileId: originalUpload.fileId,
        originalFileSize: originalUpload.fileSize,
      };
      sourceImageForProvider = originalUpload.url;

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
    const providerImage = await runProviderImageGeneration({
      prompt,
      providerId: provider.id,
      modelId: model.id,
      size: model.defaultResolution,
      quality: preset.parameters.quality,
      style: preset.parameters.style,
      sourceImageUrl: sourceImageForProvider,
    });

    let generatedImageUrl = providerImage.url;
    let fileSize: number | null = null;
    const completedParameters: GenerationParameters = {
      ...workingParameters,
      providerImageUrl: providerImage.url,
    };

    if (isImageKitConfigured()) {
      const uploaded = providerImage.buffer
        ? await uploadBufferToImageKit({
            buffer: providerImage.buffer,
            userId: params.userId,
            folderKind: 'generated',
            fileName: `${generationId}.png`,
            mimeType: providerImage.mimeType ?? 'image/png',
          })
        : await uploadRemoteImageToImageKit({
            imageUrl: providerImage.url,
            userId: params.userId,
            folderKind: 'generated',
            fileName: `${generationId}.png`,
          });

      generatedImageUrl = uploaded.url;
      fileSize = uploaded.fileSize;
      completedParameters.imageKitGeneratedFileId = uploaded.fileId;
    }

    completedParameters.thumbnailUrl = buildImageKitThumbnailUrl(generatedImageUrl, 200);

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
  style?: GenerationStyle;
  status?: GenerationStatus;
}) {
  const limit = Math.min(params.limit ?? DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
  const conditions: SQL[] = [eq(generations.userId, params.userId)];

  if (params.cursorCreatedAt) {
    conditions.push(lt(generations.createdAt, params.cursorCreatedAt));
  }

  if (params.style) {
    conditions.push(eq(generations.style, params.style));
  }

  if (params.status) {
    conditions.push(eq(generations.generationStatus, params.status));
  }

  return db.query.generations.findMany({
    where: and(...conditions),
    orderBy: desc(generations.createdAt),
    limit,
  });
}

export async function hasRecentGenerationCapacity(userId: string) {
  const windowStart = new Date(Date.now() - GENERATION_RATE_LIMIT_WINDOW_MS);
  const rows = await db
    .select({ value: count() })
    .from(generations)
    .where(and(eq(generations.userId, userId), gt(generations.createdAt, windowStart)));

  return (rows[0]?.value ?? 0) < GENERATION_RATE_LIMIT;
}

function collectImageKitFileIds(parameters: GenerationParameters) {
  return ['imageKitOriginalFileId', 'imageKitGeneratedFileId']
    .map((key) => parameters[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export async function deleteUserGeneration(params: { userId: string; generationId: string }) {
  const generation = await db.query.generations.findFirst({
    where: and(eq(generations.id, params.generationId), eq(generations.userId, params.userId)),
  });

  if (!generation) {
    return null;
  }

  await db
    .delete(generations)
    .where(and(eq(generations.id, params.generationId), eq(generations.userId, params.userId)));

  await deleteImageKitFiles(collectImageKitFileIds(generation.parameters));

  return generation;
}

export async function getRecentGenerationStats(userId: string) {
  const rows = await getUserGenerationHistory({ userId, limit: 5 });

  return {
    recentRows: rows,
    recentStyleCount: new Set(rows.map((generation: GenerationRow) => generation.style)).size,
  };
}
