import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

const MAXIMUM_LINES_PER_FILE = 500;
// Each file leaves this list when it is split; nothing new is added to it.
const FILES_PENDING_SPLIT = [
  'src/features/async-chaos-lab/payment-simulation/controller.ts',
  'src/features/async-chaos-lab/scaling/controller.ts',
  'src/features/pills/components/PillReader.astro',
];

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
  {
    files: FILES_PENDING_SPLIT,
    rules: { 'max-lines': 'off' },
  },
);
