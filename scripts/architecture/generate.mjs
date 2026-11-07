// Builds the architecture map from the code itself: units, files, real imports and each unit's README.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const source = join(root, 'src');
const output = join(root, 'architecture-site');
const repository = 'https://github.com/nicovegasr/nicovegasr-blog/blob/main';
const skippedFiles = /\.(test|e2e)\.ts$|\.md$/;
// Edges that break the direction on purpose; each one is explained in docs/technical/architecture.md.
const DOCUMENTED_EXCEPTIONS = new Set(['content>features/pills']);

const LAYERS = [
  { id: 'routes', title: 'Routes', caption: 'src/pages · one per URL and language' },
  { id: 'shell', title: 'Shell and content', caption: 'shared frame · Markdown and schemas' },
  { id: 'features', title: 'Features', caption: 'src/features · never import each other' },
  { id: 'shared', title: 'Shared', caption: 'src/shared · never imports a feature' },
  { id: 'cross', title: 'Cross-cutting', caption: 'used everywhere' },
];

const FIXED_UNITS = {
  pages: {
    layer: 'routes',
    title: 'Routes',
    path: 'src/pages',
    job: 'One route per URL and language. Each declares its paths and renders the page component of its feature.',
    notes: ['Astro requires them here, so Spanish and English routes repeat a few lines, never logic.'],
  },
  layouts: {
    layer: 'shell',
    title: 'Shell',
    path: 'src/layouts',
    job: 'The frame of every page: head and SEO, navigation, footer, theme, language and the repository star.',
    notes: ['It depends on no feature. It is the only user of the site-wide dictionary in i18n.'],
  },
  content: {
    layer: 'shell',
    title: 'Content',
    path: 'src/content',
    extraFiles: ['src/content.config.ts'],
    job: 'Markdown per collection and language, the friends JSON and the Zod schemas in content.config.ts.',
    notes: ['The language lives in the file path, never in the frontmatter.'],
  },
  i18n: {
    layer: 'cross',
    title: 'i18n',
    path: 'src/i18n',
    job: 'Languages, localized routes, the shell dictionary and defineCopy for every feature catalogue.',
    notes: ['Every interface text goes through defineCopy and a Locale; nothing picks between two literals.'],
  },
  styles: {
    layer: 'cross',
    title: 'styles',
    path: 'src/styles',
    job: 'Design tokens and global base styles.',
    notes: [],
  },
};

const listFiles = (directory) =>
  readdirSync(directory, { recursive: true })
    .map((path) => join(directory, path))
    .filter((path) => statSync(path).isFile());

const toRepositoryPath = (path) => relative(root, path).split(sep).join('/');

function readme(directory) {
  const path = join(directory, 'README.md');
  if (!existsSync(path)) return undefined;
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const title = (lines.find((line) => line.startsWith('# ')) ?? '').slice(2).trim();
  const afterTitle = text.slice(text.indexOf('\n', text.indexOf('# ')) + 1);
  const job = afterTitle.split(/\n\s*\n/).find((block) => block.trim() && !block.trim().startsWith('#')) ?? '';
  const section = (heading) => {
    const match = text.match(new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
    return match
      ? match[1]
          .split('\n')
          .filter((line) => line.startsWith('- '))
          .map((line) => line.slice(2).trim())
      : [];
  };
  return {
    title,
    job: job.replace(/\s+/g, ' ').trim(),
    inside: section('Inside'),
    notes: section('Notes'),
    readme: `${repository}/${toRepositoryPath(path)}`,
  };
}

const units = {};
const missingReadmes = [];
for (const [id, unit] of Object.entries(FIXED_UNITS)) units[id] = { id, ...unit, directory: join(root, unit.path) };

for (const area of ['features', 'shared']) {
  for (const name of readdirSync(join(source, area))) {
    const directory = join(source, area, name);
    if (!statSync(directory).isDirectory()) continue;
    const id = `${area}/${name}`;
    const notes = readme(directory);
    if (!notes) missingReadmes.push(toRepositoryPath(directory));
    units[id] = {
      id,
      layer: area,
      path: toRepositoryPath(directory),
      directory,
      ...notes,
      name: notes?.title,
      title: name,
    };
    if (area !== 'features') continue;
    // A subfolder with its own README is a unit of its own inside the feature (the labs).
    for (const child of readdirSync(directory)) {
      const childDirectory = join(directory, child);
      if (!statSync(childDirectory).isDirectory()) continue;
      const childNotes = readme(childDirectory);
      if (!childNotes) continue;
      const childId = `${id}/${child}`;
      units[childId] = {
        id: childId,
        parent: id,
        layer: area,
        path: toRepositoryPath(childDirectory),
        directory: childDirectory,
        ...childNotes,
        name: childNotes.title,
        title: child,
      };
    }
  }
}
if (missingReadmes.length) {
  console.error(`Every feature and shared piece needs a README.md:\n${missingReadmes.join('\n')}`);
  process.exit(1);
}

// Deepest unit that contains a path.
const unitOf = (path) =>
  Object.values(units)
    .filter(
      (unit) =>
        path === unit.directory ||
        path.startsWith(unit.directory + sep) ||
        (unit.extraFiles ?? []).some((file) => join(root, file) === path),
    )
    .sort((first, second) => second.directory.length - first.directory.length)[0];

const importPattern = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const edges = new Map();
const fileCounts = {};
const files = [...listFiles(source)];
for (const file of files) {
  const unit = unitOf(file);
  if (!unit) continue;
  if (!skippedFiles.test(file)) fileCounts[unit.id] = (fileCounts[unit.id] ?? 0) + 1;
  if (!/\.(ts|astro|mjs)$/.test(file) || /\.(test|e2e)\.ts$/.test(file)) continue;
  for (const match of readFileSync(file, 'utf8').matchAll(importPattern)) {
    const specifier = (match[1] ?? match[2]).split('?')[0];
    let target;
    if (specifier.startsWith('@/')) target = join(source, specifier.slice(2));
    else if (specifier.startsWith('.')) target = resolve(dirname(file), specifier);
    else continue;
    const targetUnit = unitOf(target);
    if (!targetUnit || targetUnit.id === unit.id) continue;
    edges.set(`${unit.id}>${targetUnit.id}`, [unit.id, targetUnit.id]);
  }
}

const topOf = (id) => units[id].parent ?? id;
function kindOf(from, to) {
  if (topOf(from) === topOf(to)) return 'inner';
  const source = units[topOf(from)];
  const target = units[topOf(to)];
  const breaksDirection =
    (source.layer === 'shared' && target.layer === 'features') ||
    (source.layer === 'features' && target.layer === 'features') ||
    (source.layer === 'shell' && target.layer === 'features') ||
    (source.layer === 'cross' && target.layer !== 'cross');
  if (!breaksDirection) return 'normal';
  return DOCUMENTED_EXCEPTIONS.has(`${from}>${to}`) ? 'exception' : 'violation';
}

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  layers: LAYERS,
  // Absolute paths stay on the machine that generated the page.
  units: Object.values(units).map((unit) => ({
    ...Object.fromEntries(Object.entries(unit).filter(([key]) => key !== 'directory' && key !== 'extraFiles')),
    count: fileCounts[unit.id] ?? 0,
  })),
  edges: [...edges.values()].map(([from, to]) => ({ from, to, kind: kindOf(from, to) })),
};

const violations = data.edges.filter((edge) => edge.kind === 'violation');
const template = readFileSync(join(import.meta.dirname, 'page.html'), 'utf8');
mkdirSync(output, { recursive: true });
writeFileSync(
  join(output, 'index.html'),
  template.replace('__ARCHITECTURE_DATA__', JSON.stringify(data).replaceAll('<', '\\u003c')),
);
console.log(
  `architecture-site/index.html · ${data.units.length} units · ${data.edges.length} dependencies · ${violations.length} violations`,
);
if (violations.length) {
  console.error(violations.map(({ from, to }) => `${from} → ${to}`).join('\n'));
  process.exit(1);
}
