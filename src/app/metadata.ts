import type { Metadata } from 'next';

export const siteMetadata: Metadata = {
  title: 'Ghib AI | Premium Image Style Transformations',
  description:
    'Transform your photos into anime paintings, clay renders, marble sculptures, pixel art, and storybook illustrations using high-fidelity generative models.',
  metadataBase: new URL('https://ghib.ai'),
  openGraph: {
    title: 'Ghib AI | Premium Image Style Transformations',
    description:
      'Transform your photos into clay renders, anime paintings, marble sculptures, pixel art, and fantasy illustrations.',
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
    title: 'Ghib AI | Premium Style Transformation',
    description:
      'Transform your photos into clay renders, anime paintings, marble sculptures, pixel art, and fantasy illustrations.',
    images: ['/og-image.jpg'],
  },
};
