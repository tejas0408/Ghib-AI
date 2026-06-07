'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Download,
  Expand,
  FileImage,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';
import type { ChangeEvent, DragEvent, KeyboardEvent, PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { openAiImageModelLabels, openAiImageModels, type OpenAiImageModel } from '@/lib/openai-image-models';
import { generationStyles, PRESETS_REGISTRY, type GenerationStyle } from '@/lib/presets-config';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const MAX_SOURCE_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_SOURCE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const styleOptions = generationStyles.map((style) => PRESETS_REGISTRY[style]);
const statusFilters = ['all', 'completed', 'failed', 'processing', 'pending'] as const;

type HistoryStatusFilter = (typeof statusFilters)[number];
type ProgressStatus = 'idle' | 'uploading' | 'ready' | 'processing' | 'completed' | 'failed';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StorageSignature {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
}

interface ImageKitUploadResponse {
  url?: string;
  fileId?: string;
  name?: string;
  message?: string;
}

interface GenerateResponse {
  generationId: string;
  status: ProgressStatus;
  generatedImageUrl: string | null;
  originalImageUrl: string;
  style: GenerationStyle;
  model: string;
  generationTime: number | null;
}

interface HistoryItem {
  id: string;
  style: GenerationStyle;
  preset: string;
  createdAt: string;
  status: ProgressStatus;
  generatedImageUrl: string | null;
  originalImageUrl: string;
  thumbnailUrl: string | null;
  model: string;
  generationTime: number | null;
  fileSize: number | null;
  errorMessage: string | null;
}

interface HistoryResponse {
  items: HistoryItem[];
  nextCursor: string | null;
}

function isAcceptedImage(file: File) {
  return ACCEPTED_SOURCE_TYPES.includes(file.type);
}

function formatBytes(value: number | null) {
  if (!value) return 'Unknown size';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function safeUploadFileName(file: File) {
  const uniquePart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : String(Date.now());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');

  return `${uniquePart}-${safeName}`;
}

function progressForStatus(status: ProgressStatus) {
  const progressByStatus: Record<ProgressStatus, number> = {
    idle: 0,
    uploading: 24,
    ready: 36,
    processing: 68,
    completed: 100,
    failed: 100,
  };

  return progressByStatus[status];
}

function apiData<T>(payload: ApiEnvelope<T> | T): T {
  if (typeof payload === 'object' && payload !== null && 'success' in payload) {
    const envelope = payload as ApiEnvelope<T>;

    if (!envelope.success || !envelope.data) {
      throw new Error(envelope.error ?? 'Request failed.');
    }

    return envelope.data;
  }

  return payload as T;
}

export function GenerateForm() {
  const activeStyle = useAppStore((state) => state.activeStyle);
  const setActiveStyle = useAppStore((state) => state.setActiveStyle);
  const setUploadedImage = useAppStore((state) => state.setUploadedImage);
  const setTransformedImage = useAppStore((state) => state.setTransformedImage);
  const setGenerating = useAppStore((state) => state.setGenerating);
  const [sourceImage, setSourceImage] = useState('');
  const [sourceImageFileId, setSourceImageFileId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [modelId, setModelId] = useState<OpenAiImageModel>('gpt-image-1');
  const [focus, setFocus] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProgressStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStyle, setHistoryStyle] = useState<GenerationStyle | 'all'>('all');
  const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>('all');
  const [splitPosition, setSplitPosition] = useState(54);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const splitRef = useRef<HTMLDivElement | null>(null);

  const activePreset = PRESETS_REGISTRY[activeStyle];
  const progress = progressForStatus(status);
  const canGenerate = Boolean(sourceImage) && !pending;

  const loadHistoryPage = async (cursor: string | null, replace: boolean) => {
    setHistoryLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '8' });

      if (cursor) params.set('cursor', cursor);
      if (historyStyle !== 'all') params.set('style', historyStyle);
      if (historyStatus !== 'all') params.set('status', historyStatus);

      const response = await fetch(`/api/history?${params.toString()}`);
      const payload = (await response.json()) as ApiEnvelope<HistoryResponse>;

      if (!payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Unable to load history.');
      }

      setHistoryItems((items) => (replace ? payload.data!.items : [...items, ...payload.data!.items]));
      setHistoryCursor(payload.data.nextCursor);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setHistoryCursor(null);
    void loadHistoryPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyStyle, historyStatus]);

  const validateFile = (file: File) => {
    if (!isAcceptedImage(file)) {
      throw new Error('Use a JPG, PNG, or WEBP source image.');
    }

    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      throw new Error('Source image must be 5MB or smaller.');
    }
  };

  const uploadFile = async (file: File) => {
    validateFile(file);
    setPending(true);
    setStatus('uploading');
    setError(null);

    try {
      const signatureResponse = await fetch('/api/storage/signature');
      const signaturePayload = await signatureResponse.json().catch(() => ({}));

      if (!signatureResponse.ok) {
        const message =
          typeof signaturePayload === 'object' && signaturePayload !== null && 'error' in signaturePayload
            ? String(signaturePayload.error)
            : 'Image upload is not configured.';
        throw new Error(message);
      }

      const signature = apiData<StorageSignature>(signaturePayload);
      const formData = new FormData();

      formData.append('file', file);
      formData.append('fileName', safeUploadFileName(file));
      formData.append('publicKey', signature.publicKey);
      formData.append('signature', signature.signature);
      formData.append('expire', String(signature.expire));
      formData.append('token', signature.token);
      formData.append('folder', signature.folder);
      formData.append('useUniqueFileName', 'true');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = (await uploadResponse.json().catch(() => ({}))) as ImageKitUploadResponse;

      if (!uploadResponse.ok || !uploadJson.url || !uploadJson.fileId) {
        throw new Error(uploadJson.message ?? 'Image upload failed.');
      }

      setSourceImage(uploadJson.url);
      setSourceImageFileId(uploadJson.fileId);
      setSourceName(uploadJson.name ?? file.name);
      setGeneratedImage(null);
      setSelectedGenerationId(null);
      setUploadedImage(uploadJson.url);
      setTransformedImage(null);
      setStatus('ready');
    } catch (uploadError) {
      setStatus('failed');
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setPending(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    await uploadFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      await uploadFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      setError('Upload an image or provide a source URL first.');
      return;
    }

    setPending(true);
    setGenerating(true);
    setStatus('processing');
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImage,
          sourceImageFileId: sourceImageFileId ?? undefined,
          style: activeStyle,
          modelId,
          focus: focus || undefined,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<GenerateResponse>;

      if (!payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Generation failed.');
      }

      setGeneratedImage(payload.data.generatedImageUrl);
      setSourceImage(payload.data.originalImageUrl);
      setSelectedGenerationId(payload.data.generationId);
      setTransformedImage(payload.data.generatedImageUrl);
      setStatus(payload.data.status);
      await loadHistoryPage(null, true);
    } catch (generationError) {
      setStatus('failed');
      setError(generationError instanceof Error ? generationError.message : 'Generation failed.');
    } finally {
      setPending(false);
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await handleGenerate();
  };

  const handleDownload = (url: string | null) => {
    if (!url) return;
    window.location.assign(`/api/download?url=${encodeURIComponent(url)}`);
  };

  const handleCopyUrl = async (url: string | null) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  };

  const handleHistoryView = (item: HistoryItem) => {
    setSourceImage(item.originalImageUrl);
    setSourceImageFileId(null);
    setSourceName(item.preset);
    setGeneratedImage(item.generatedImageUrl);
    setSelectedGenerationId(item.id);
    setActiveStyle(item.style);
    setModelId(openAiImageModels.includes(item.model as OpenAiImageModel) ? (item.model as OpenAiImageModel) : 'gpt-image-1');
    setUploadedImage(item.originalImageUrl);
    setTransformedImage(item.generatedImageUrl);
    setStatus(item.status);
  };

  const handleHistoryDelete = async (generationId: string) => {
    setError(null);

    try {
      const response = await fetch('/api/delete-generation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId }),
      });
      const payload = (await response.json()) as ApiEnvelope<{ generationId: string; deleted: boolean }>;

      if (!payload.success) {
        throw new Error(payload.error ?? 'Unable to delete generation.');
      }

      setHistoryItems((items) => items.filter((item) => item.id !== generationId));

      if (selectedGenerationId === generationId) {
        setGeneratedImage(null);
        setSelectedGenerationId(null);
        setTransformedImage(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete generation.');
    }
  };

  const setPositionFromClientX = (clientX: number) => {
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect) return;

    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplitPosition(Math.min(92, Math.max(8, next)));
  };

  const handleSplitPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDraggingSplit(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setPositionFromClientX(event.clientX);
  };

  const handleSplitPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingSplit) return;
    setPositionFromClientX(event.clientX);
  };

  const handleSplitPointerEnd = () => {
    setDraggingSplit(false);
  };

  const handleSplitKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setSplitPosition((value) => Math.max(8, value - 4));
    }
    if (event.key === 'ArrowRight') {
      setSplitPosition((value) => Math.min(92, value + 4));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase text-marine">Control Panel</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">Creative Workstation</h2>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
            <WandSparkles className="h-5 w-5 text-marine" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase text-muted">Upload</p>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
            className={cn(
              'relative flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition',
              dropActive
                ? 'border-marine bg-marine/10'
                : 'border-white/[0.14] bg-white/[0.035] hover:border-white/[0.28]',
            )}
          >
            <UploadCloud className="mb-3 h-8 w-8 text-marine" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">{sourceName ?? 'JPG, PNG, WEBP up to 5MB'}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted">
              {sourceImage ? 'Source image is ready for transformation.' : 'Drop a source file or select one from disk.'}
            </p>
            <Button className="mt-4" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={pending}>
              <FileImage className="h-4 w-4" aria-hidden="true" />
              Select Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          <label className="mt-4 block text-xs font-medium uppercase text-muted" htmlFor="sourceUrl">
            Source URL
          </label>
          <input
            id="sourceUrl"
            type="url"
            value={sourceImage}
            onChange={(event) => {
              setSourceImage(event.target.value);
              setSourceImageFileId(null);
              setSourceName(event.target.value ? 'Remote source' : null);
              setUploadedImage(event.target.value || null);
              setStatus(event.target.value ? 'ready' : 'idle');
            }}
            placeholder="https://..."
            disabled={pending}
            className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition placeholder:text-muted/60 focus:border-white/30 focus:outline-none"
          />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase text-muted">Style Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {styleOptions.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActiveStyle(preset.id)}
                disabled={pending}
                className={cn(
                  'focus-ring min-h-16 rounded-lg border px-3 py-2 text-left transition',
                  activeStyle === preset.id
                    ? 'border-white/[0.32] bg-white/[0.1] text-ink'
                    : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-accent',
                )}
              >
                <span className="block text-sm font-medium">{preset.name}</span>
                <span className="mt-1 block text-[11px] leading-4 text-muted">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="modelId">
              Model Engine
            </label>
            <select
              id="modelId"
              value={modelId}
              onChange={(event) => setModelId(event.target.value as OpenAiImageModel)}
              disabled={pending}
              className="h-11 w-full rounded-lg border border-white/10 bg-secondary px-4 text-sm text-ink focus:border-white/30 focus:outline-none"
            >
              {openAiImageModels.map((model) => (
                <option key={model} value={model}>
                  {openAiImageModelLabels[model]}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase text-muted">Preset Mode</p>
            <p className="mt-1 text-sm text-ink">{activePreset.parameters.style}</p>
            <p className="mt-1 text-xs text-muted">{activePreset.parameters.quality} quality</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="focus">
            Focus Guidance
          </label>
          <textarea
            id="focus"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            maxLength={500}
            disabled={pending}
            className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-ink transition placeholder:text-muted/60 focus:border-white/30 focus:outline-none"
            placeholder="Subject details, material finish, background mood"
          />
        </div>

        {error ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-rose/25 bg-rose/10 p-3 text-sm leading-6 text-rose">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button className="mt-6 w-full" size="lg" onClick={handleGenerate} disabled={!canGenerate}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          Generate Artwork
        </Button>
      </section>

      <section className="min-w-0">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase text-marine">Display Area</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">Output Preview</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleDownload(generatedImage)} disabled={!generatedImage}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setFullscreenImage(generatedImage)} disabled={!generatedImage}>
                <Expand className="h-4 w-4" aria-hidden="true" />
                Fullscreen
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void handleCopyUrl(generatedImage)} disabled={!generatedImage}>
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                Copy URL
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void handleRegenerate()} disabled={!canGenerate}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Regenerate
              </Button>
            </div>
          </div>

          <div
            ref={splitRef}
            role="slider"
            aria-label="Before and after comparison"
            aria-valuemin={8}
            aria-valuemax={92}
            aria-valuenow={Math.round(splitPosition)}
            tabIndex={0}
            onKeyDown={handleSplitKeyDown}
            onPointerDown={handleSplitPointerDown}
            onPointerMove={handleSplitPointerMove}
            onPointerUp={handleSplitPointerEnd}
            onPointerCancel={handleSplitPointerEnd}
            className="focus-ring relative mt-5 aspect-[4/3] min-h-[360px] cursor-ew-resize overflow-hidden rounded-lg border border-white/10 bg-secondary"
          >
            {sourceImage ? (
              <img src={sourceImage} alt="Source preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.03] text-center text-muted">
                <FileImage className="mb-3 h-10 w-10 opacity-50" aria-hidden="true" />
                <p className="text-sm">No source image selected</p>
              </div>
            )}

            {generatedImage ? (
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}>
                <img src={generatedImage} alt="Generated transformation output" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full border border-white/[0.12] bg-black/50 px-3 py-1 text-xs text-ink backdrop-blur-xl">
                  {activePreset.name}
                </div>
              </div>
            ) : null}

            {generatedImage ? (
              <div className="absolute inset-y-0 z-20 w-px bg-ink" style={{ left: `${splitPosition}%` }} aria-hidden="true">
                <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/80 shadow-soft-glow backdrop-blur-xl">
                  <WandSparkles className="h-5 w-5 text-ink" aria-hidden="true" />
                </div>
              </div>
            ) : null}

            {sourceImage ? (
              <div className="absolute right-4 top-4 rounded-full border border-white/[0.12] bg-black/50 px-3 py-1 text-xs text-ink backdrop-blur-xl">
                Source
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-4 text-xs uppercase text-muted">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={cn('h-full rounded-full transition-all duration-500', status === 'failed' ? 'bg-rose' : 'bg-marine')}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase text-ember">Generation History</p>
              <h2 className="mt-2 font-serif text-2xl text-ink">Recent Outputs</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={historyStyle}
                onChange={(event) => setHistoryStyle(event.target.value as GenerationStyle | 'all')}
                className="h-10 rounded-lg border border-white/10 bg-secondary px-3 text-sm text-ink focus:border-white/30 focus:outline-none"
              >
                <option value="all">All styles</option>
                {generationStyles.map((style) => (
                  <option key={style} value={style}>
                    {PRESETS_REGISTRY[style].name}
                  </option>
                ))}
              </select>
              <select
                value={historyStatus}
                onChange={(event) => setHistoryStatus(event.target.value as HistoryStatusFilter)}
                className="h-10 rounded-lg border border-white/10 bg-secondary px-3 text-sm text-ink focus:border-white/30 focus:outline-none"
              >
                {statusFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter === 'all' ? 'All statuses' : filter}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {historyItems.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center text-muted">
              <FileImage className="mb-3 h-9 w-9 opacity-50" aria-hidden="true" />
              <p className="text-sm">{historyLoading ? 'Loading history...' : 'No generation records found.'}</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {historyItems.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    'overflow-hidden rounded-lg border bg-white/[0.025] transition hover:border-white/20',
                    selectedGenerationId === item.id ? 'border-marine/50' : 'border-white/10',
                  )}
                >
                  <button type="button" onClick={() => handleHistoryView(item)} className="block aspect-square w-full overflow-hidden bg-white/[0.03]">
                    {item.thumbnailUrl || item.generatedImageUrl ? (
                      <img
                        src={item.thumbnailUrl ?? item.generatedImageUrl ?? ''}
                        alt={`${item.style} generation`}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center p-4 text-xs uppercase text-muted">
                        {item.status}
                      </span>
                    )}
                  </button>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs uppercase text-muted">{PRESETS_REGISTRY[item.style].name}</p>
                        <p className="mt-1 truncate font-serif text-base text-ink">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-marine" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-muted">{item.model} / {formatBytes(item.fileSize)}</p>
                    <div className="mt-3 flex gap-1">
                      <button
                        type="button"
                        title="Download"
                        onClick={() => handleDownload(item.generatedImageUrl)}
                        disabled={!item.generatedImageUrl}
                        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted transition hover:text-ink disabled:opacity-40"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Copy URL"
                        onClick={() => void handleCopyUrl(item.generatedImageUrl)}
                        disabled={!item.generatedImageUrl}
                        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted transition hover:text-ink disabled:opacity-40"
                      >
                        <Clipboard className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void handleHistoryDelete(item.id)}
                        className="focus-ring ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose/20 bg-rose/10 text-rose transition hover:bg-rose/15"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {historyCursor ? (
            <div className="mt-5 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => void loadHistoryPage(historyCursor, false)} disabled={historyLoading}>
                {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Load More
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {fullscreenImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Close fullscreen preview"
            onClick={() => setFullscreenImage(null)}
            className="focus-ring absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img src={fullscreenImage} alt="Fullscreen generated transformation" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </div>
  );
}
