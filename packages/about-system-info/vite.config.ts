import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import fs from 'fs';

export default defineConfig({
  build: {
    lib: {
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'system-info-api': resolve(__dirname, 'src/system-info-api.ts'),
        'about-system-cli': resolve(__dirname, 'src/about-system-cli.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['os', 'fs', 'path', 'child_process', 'https', 'url'],
      output: {
        preserveModules: false,
        exports: 'named',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'node18',
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      rollupTypes: true,
    }),
    {
      name: 'copy-json-files',
      writeBundle() {
        const files = [
          { src: 'src/bench/cpu-geekbench.json', dst: 'dist/cpu-geekbench.json' },
          { src: 'src/bench/gpu-geekbench.json', dst: 'dist/gpu-geekbench.json' },
        ];
        files.forEach(({ src, dst }) => {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
          }
        });
      },
    },
  ],
});
