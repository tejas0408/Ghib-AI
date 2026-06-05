import type { Metadata } from 'next';

export const siteMetadata: Metadata = {
  title: 'Ghib AI | Portfolio Art Workstation',
  description:
    'A high-performance AI Image Workstation transforming imagery into premium anime frames, clay renders, marble sculptures, pixel models, and storybook sketches.',
  metadataBase: new URL('https://ghib.ai'),
  openGraph: {
    title: 'Ghib AI | Portfolio Art Workstation',
    description:
      'A high-performance AI Image Workstation transforming imagery into premium anime frames, clay renders, marble sculptures, pixel models, and storybook sketches.',
    url: 'https://ghib.ai',
    siteName: 'Ghib AI',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ghib AI style preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ghib AI | Portfolio Art Workstation',
    description:
      'A high-performance AI Image Workstation transforming imagery into premium anime frames, clay renders, marble sculptures, pixel models, and storybook sketches.',
    images: ['/og-image.jpg'],
  },
};
