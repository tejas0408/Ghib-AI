import type { NextConfig } from 'next';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Automatically extract image sequences from zip files if they aren't extracted
try {
  const publicDir = path.join(process.cwd(), 'public');
  for (const folder of ['1', '2', '3']) {
    const destPath = path.join(publicDir, folder);
    const zipPath = path.join(publicDir, `${folder}.zip`);
    if (!fs.existsSync(destPath) && fs.existsSync(zipPath)) {
      console.log(`[Setup] Extracting ${folder}.zip to ${destPath}...`);
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`);
      console.log(`[Setup] Extracted ${folder}.zip successfully.`);
    }
  }
} catch (error) {
  console.error('[Setup] Error during archive extraction:', error);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
