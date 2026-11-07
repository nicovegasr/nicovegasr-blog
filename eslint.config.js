import { readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

const MAXIMUM_LINES_PER_FILE = 500;

const FEATURES = readdirSync('src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
// A feature may import another only through these doors (path prefixes); anything else goes through shared/.
// Empty on purpose: add a door only when a dependency between features is justified.
const FEATURE_DOORS = {};

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

// The alias rules above only see `@/` paths, so a relative import may not leave its own feature or shared piece.
const sourceRoot = resolve(import.meta.dirname, 'src');
const unitOf = (path) => {
  const [area, unit] = relative(sourceRoot, path).split(sep);
  return area === 'features' || area === 'shared' ? `${area}/${unit}` : undefined;
};
const boundaries = {
  rules: {
    'relative-imports-stay-inside': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        const unit = unitOf(context.filename);
        const check = (node) => {
          const target = node.source?.value;
          if (!unit || typeof target !== 'string' || !target.startsWith('.')) return;
          const resolved = resolve(dirname(context.filename), target);
          if (unitOf(resolved) !== unit) {
            context.report({
              node: node.source,
              message: `Import outside ${unit} with the @/ alias, so the boundary rules can check it.`,
            });
          }
        };
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        };
      },
    },
  },
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
  {
    files: ['src/features/**', 'src/shared/**'],
    plugins: { boundaries },
    rules: { 'boundaries/relative-imports-stay-inside': 'error' },
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
