import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el sitio funciona tanto en la raíz como en /Astronymic/ (GitHub Pages).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
