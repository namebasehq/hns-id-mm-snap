// snap.config.ts
import { resolve } from 'path';
import type { SnapConfig } from '@metamask/snaps-cli';

const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.ts'),
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  server: {
    port: 8080,
  },
};

export default config;