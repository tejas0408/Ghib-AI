'use client';

import { ImageIcon, Loader2, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { generateImage } from '@/actions/generate';
import { useAppStore, type TransformStyle } from '@/lib/store';
import { cn } from '@/lib/utils';

const styleOptions: Array<{ id: TransformStyle; label: string }> = [
  { id: 'anime', label: 'Anime' },
  { id: 'clay', label: 'Clay' },
  { id: 'marble', label: 'Marble' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'storybook', label: 'Storybook' },
];

type GenerateFormProps = {
  initialRemaining: number;
  initialLimit: number;
};

export function GenerateForm({ initialRemaining, initialLimit }: GenerateFormProps) {
  const activeStyle = useAppStore((state) => state.activeStyle);
  const setActiveStyle = useAppStore((state) => state.setActiveStyle);
  const [sourceImage, setSourceImage] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await generateImage({
      sourceImage,
      style: activeStyle,
    });

    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }

    setResultImage(result.imageUrl);
    setRemaining(result.remaining);
    setPending(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="font-serif text-3xl text-ink">Transform Photo</h2>
            <p className="mt-1 text-sm text-muted">
              {remaining} of {initialLimit} renders remaining
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
            <WandSparkles className="h-5 w-5 text-marine" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="sourceImage">
            Source Image URL
          </label>
          <input
            id="sourceImage"
            type="url"
            value={sourceImage}
            onChange={(event) => setSourceImage(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition focus:border-white/30 focus:outline-none"
            placeholder="https://example.com/photo.jpg"
            disabled={pending}
            required
          />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase text-muted">Style</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {styleOptions.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setActiveStyle(style.id)}
                disabled={pending}
                className={cn(
                  'focus-ring inline-flex h-10 items-center justify-center rounded-full border px-3 text-sm transition',
                  activeStyle === style.id
                    ? 'border-white/[0.28] bg-white/[0.1] text-ink'
                    : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-accent',
                )}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-rose/20 bg-rose/10 p-3 text-sm text-rose">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending || remaining <= 0}
          className="focus-ring mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-background transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          Generate Artwork
        </button>
      </form>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-xl">
        <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
          {resultImage ? (
            <img src={resultImage} alt="Generated transformation output" className="h-full w-full object-cover" />
          ) : sourceImage ? (
            <img src={sourceImage} alt="Source preview" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="text-center text-muted">
              <ImageIcon className="mx-auto mb-3 h-10 w-10 opacity-50" aria-hidden="true" />
              <p className="text-sm">No source image selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
