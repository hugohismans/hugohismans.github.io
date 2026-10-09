// @ts-check
import { defineConfig } from 'astro/config';

// Site statique publié sur GitHub Pages, à la racine du domaine.
export default defineConfig({
  site: 'https://hugohismans.github.io',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
  devToolbar: { enabled: false },
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
