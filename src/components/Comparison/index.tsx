'use client';

import { motion } from 'framer-motion';
import { MoveHorizontal, Upload } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent, PointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fadeUp, staggerContainer } from '@/components/AnimationVariants';
import { Button } from '@/components/ui/button';
import { useAppStore, type TransformStyle } from '@/lib/store';

const styleCopy: Record<TransformStyle, { label: string; gradient: string; filter: string }> = {
  anime: {
    label: 'Anime Style',
    gradient: 'linear-gradient(135deg, rgba(242,160,182,0.64), rgba(122,215,209,0.18))',
    filter: 'contrast(1.18) saturate(1.35)',
  },
  clay: {
    label: 'Clay Render',
    gradient: 'linear-gradient(135deg, rgba(243,179,106,0.56), rgba(248,245,239,0.2))',
    filter: 'contrast(0.92) saturate(0.92) brightness(1.08)',
  },
  marble: {
    label: 'Marble Sculpture',
    gradient: 'linear-gradient(135deg, rgba(248,245,239,0.72), rgba(122,215,209,0.12))',
    filter: 'contrast(1.05) saturate(0.48) brightness(1.18)',
  },
  pixel: {
    label: 'Pixel Art',
    gradient: 'linear-gradient(135deg, rgba(122,215,209,0.62), rgba(242,160,182,0.18))',
    filter: 'contrast(1.28) saturate(1.2)',
  },
  storybook: {
    label: 'Storybook Illustration',
    gradient: 'linear-gradient(135deg, rgba(243,179,106,0.42), rgba(242,160,182,0.34))',
    filter: 'contrast(0.98) saturate(1.12) sepia(0.14)',
  },
};

type UploadForm = {
  image: FileList;
};

const imageFileSchema = z.custom<File>((file) => {
  const candidate = file as File | undefined;
  return Boolean(candidate?.type?.startsWith('image/'));
});

export function Comparison() {
  const activeStyle = useAppStore((state) => state.activeStyle);
  const uploadedImageUrl = useAppStore((state) => state.uploadedImageUrl);
  const setUploadedImage = useAppStore((state) => state.setUploadedImage);
  const [position, setPosition] = useState(58);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastObjectUrl = useRef<string | null>(null);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const { register } = useForm<UploadForm>();
  const imageRegister = register('image');
  const style = styleCopy[activeStyle];

  useEffect(() => {
    return () => {
      if (lastObjectUrl.current) {
        URL.revokeObjectURL(lastObjectUrl.current);
      }
    };
  }, []);

  const setPositionFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(92, Math.max(8, next)));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setPositionFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPositionFromClientX(event.clientX);
  };

  const handlePointerEnd = () => {
    setDragging(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setPosition((value) => Math.max(8, value - 4));
    }
    if (event.key === 'ArrowRight') {
      setPosition((value) => Math.min(92, value + 4));
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const validation = imageFileSchema.safeParse(file);

    if (!validation.success || !file) {
      setUploadError('Choose an image file.');
      return;
    }

    if (lastObjectUrl.current) {
      URL.revokeObjectURL(lastObjectUrl.current);
    }

    const nextUrl = URL.createObjectURL(file);
    lastObjectUrl.current = nextUrl;
    setUploadedImage(nextUrl);
    setUploadError(null);
  };

  const sourceBackground = uploadedImageUrl
    ? `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.28)), url(${uploadedImageUrl})`
    : 'linear-gradient(135deg, rgba(168,168,168,0.28), rgba(5,5,5,0.6)), linear-gradient(45deg, #202020, #080808)';

  const afterBackground = uploadedImageUrl
    ? `${style.gradient}, url(${uploadedImageUrl})`
    : `${style.gradient}, linear-gradient(45deg, #151515, #050505)`;

  return (
    <section id="comparison" className="py-24 sm:py-28">
      <motion.div
        className="section-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer(0.1)}
      >
        <motion.div variants={fadeUp()}>
          <p className="mb-4 text-sm text-marine">Before / After</p>
          <h2 className="font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
            Inspect the transformation with a tactile reveal slider.
          </h2>
          <p className="mt-6 text-base leading-8 text-muted">
            The workspace supports drag, touch, and keyboard input. Upload a local
            image to preview how the selected style treats your own source.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => uploadInput.current?.click()} variant="primary">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Source
            </Button>
            <Button
              onClick={() => {
                if (lastObjectUrl.current) {
                  URL.revokeObjectURL(lastObjectUrl.current);
                  lastObjectUrl.current = null;
                }
                setUploadedImage(null);
                setUploadError(null);
                if (uploadInput.current) {
                  uploadInput.current.value = '';
                }
              }}
              variant="secondary"
            >
              Reset Preview
            </Button>
          </div>
          <input
            {...imageRegister}
            ref={(node) => {
              imageRegister.ref(node);
              uploadInput.current = node;
            }}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              imageRegister.onChange(event);
              handleFileChange(event);
            }}
          />
          {uploadError ? <p className="mt-3 text-sm text-rose">{uploadError}</p> : null}
        </motion.div>

        <motion.div variants={fadeUp(0.1)}>
          <div
            ref={containerRef}
            role="slider"
            aria-label="Before and after comparison"
            aria-valuemin={8}
            aria-valuemax={92}
            aria-valuenow={Math.round(position)}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className="focus-ring relative aspect-[4/3] min-h-[360px] cursor-ew-resize overflow-hidden rounded-lg border border-white/10 bg-secondary shadow-marine-glow"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: sourceBackground }}
            />
            <div className="absolute left-4 top-4 rounded-full border border-white/[0.12] bg-black/40 px-3 py-1 text-xs text-ink backdrop-blur-xl">
              Source
            </div>

            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-blend-overlay"
                style={{
                  backgroundImage: afterBackground,
                  filter: style.filter,
                }}
              />
              <div className="absolute inset-0 transparency-grid opacity-[0.12] mix-blend-screen" />
              <div className="absolute right-4 top-4 rounded-full border border-white/[0.12] bg-black/40 px-3 py-1 text-xs text-ink backdrop-blur-xl">
                {style.label}
              </div>
            </div>

            <div
              className="absolute inset-y-0 z-20 w-px bg-ink"
              style={{ left: `${position}%` }}
              aria-hidden="true"
            >
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/80 shadow-soft-glow backdrop-blur-xl">
                <MoveHorizontal className="h-5 w-5 text-ink" aria-hidden="true" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
