import { create } from 'zustand';
import type { GenerationStyle } from '@/lib/presets-config';

export type TransformStyle = GenerationStyle;

interface AppState {
  activeStyle: TransformStyle;
  isGenerating: boolean;
  uploadedImageUrl: string | null;
  transformedImageUrl: string | null;
  mobileMenuOpen: boolean;
  setActiveStyle: (style: TransformStyle) => void;
  setGenerating: (status: boolean) => void;
  setUploadedImage: (url: string | null) => void;
  setTransformedImage: (url: string | null) => void;
  toggleMobileMenu: (open?: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeStyle: 'clay',
  isGenerating: false,
  uploadedImageUrl: null,
  transformedImageUrl: null,
  mobileMenuOpen: false,
  setActiveStyle: (style) => set({ activeStyle: style }),
  setGenerating: (status) => set({ isGenerating: status }),
  setUploadedImage: (url) => set({ uploadedImageUrl: url }),
  setTransformedImage: (url) => set({ transformedImageUrl: url }),
  toggleMobileMenu: (open) =>
    set((state) => ({
      mobileMenuOpen: open !== undefined ? open : !state.mobileMenuOpen,
    })),
}));
