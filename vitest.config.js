// vitest.config.js or vite.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
        // Exclude the folder where your Playwright tests are located
        exclude: ['playwright/**/*', 'e2e/**/*', '**/node_modules/**']
    }
});