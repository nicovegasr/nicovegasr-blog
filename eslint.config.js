import { readdirSync } from 'node:fs';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

const MAXIMUM_LINES_PER_FILE = 500;

const FEATURES = readdirSync('src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
// A feature may import another only through these doors (path prefixes); anything else goes through shared/.
const FEATURE_DOORS = {
  labs: [
    'async-chaos-lab/catalogue-entry',
    'async-chaos-lab/catalogue-preview/',
    'out-of-memory-lab/catalogue-entry',
    'out-of-memory-lab/catalogue-preview/',
  ],
  'async-chaos-lab': ['labs/lab-entry'],
  'out-of-memory-lab': ['labs/lab-entry'],
  posts: ['friend-blogs/components/'],
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const featureBoundary = (feature) => {
  const allowed = [`${feature}/`, ...(FEATURE_DOORS[feature] ?? [])].map(escapeRegex).join('|');
  return {
    files: [`src/features/${feature}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@/features/(?!${allowed})`,
              message:
                'Features do not import each other; move the shared part to src/shared/ or add a door in FEATURE_DOORS.',
            },
          ],
        },
      ],
    },
  };
};

export default tseslint.config(
  { ignores: ['dist', '.astro', 'poc', 'studio', 'assets', 'playwright-report', 'test-results', '.claude'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      'id-denylist': ['error', 'cfg', 'tmp', 'val', 'btn', 'desc', 'asc', 'len', 'num', 'util'],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.astro'],
    ignores: ['src/**/*.test.ts', 'src/**/*.e2e.ts'],
    rules: {
      'max-lines': ['error', { max: MAXIMUM_LINES_PER_FILE, skipBlankLines: true }],
    },
  },
  ...FEATURES.map(featureBoundary),
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/features/**', '**/features/**'], message: 'Shared code must not depend on a feature.' },
          ],
        },
      ],
    },
  },
);
