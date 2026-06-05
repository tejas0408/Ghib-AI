import type { LucideIcon } from 'lucide-react';
import type { TransformStyle } from '@/lib/store';

export interface StyleProfile {
  id: TransformStyle;
  title: string;
  description: string;
  accent: string;
  Icon: LucideIcon;
}

export interface GalleryItem {
  title: string;
  style: string;
  color: string;
  heightClass: string;
}
