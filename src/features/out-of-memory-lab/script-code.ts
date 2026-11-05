import type { Build, Card } from './engine';

export type CodeLine =
  | { readonly kind: 'code'; readonly indent: number; readonly text: string; readonly card?: Card }
  | { readonly kind: 'hole'; readonly indent: number; readonly hole: 'read' | 'write'; readonly text: string }
  | { readonly kind: 'batch-size'; readonly indent: number };

const code = (indent: number, text: string, card?: Card): CodeLine =>
  card === undefined ? { kind: 'code', indent, text } : { kind: 'code', indent, text, card };

const writeLines = (build: Build, indent: number): CodeLine[] => {
  switch (build.write) {
    case null:
      return [{ kind: 'hole', indent, hole: 'write', text: '// ② ¿cómo guardas cada resumen?' }];
    case 'one-by-one':
      return [code(indent, 'summaryRepository.save(summary);', 'one-by-one')];
    case 'batches':
      return [
        code(indent, 'batch.add(summary);', 'batches'),
        code(indent, 'if (batch.size() == batchSize) {', 'batches'),
        code(indent + 1, 'write(batch);', 'batches'),
        code(indent + 1, 'batch.clear();', 'batches'),
        code(indent, '}', 'batches'),
      ];
  }
};

const perLog = (build: Build, indent: number): CodeLine[] => [
  code(indent, 'analyzer.accept(log).ifPresent(summary -> {'),
  ...writeLines(build, indent + 1),
  code(indent, '});'),
];

const readLines = (build: Build): CodeLine[] => {
  switch (build.read) {
    case null:
      return [
        { kind: 'hole', indent: 1, hole: 'read', text: '// ① ¿cómo coges los logs?' },
        code(1, 'for (LogEntry log : logs) {'),
        ...perLog(build, 2),
        code(1, '}'),
      ];
    case 'load-all':
      return [
        code(1, 'List<LogEntry> logs = repo.findAllOrdered(id);', 'load-all'),
        code(1, 'for (LogEntry log : logs) {'),
        ...perLog(build, 2),
        code(1, '}'),
      ];
    case 'cursor':
      return [
        code(1, 'try (Stream<LogEntry> logs = repo.streamAllOrdered(id)) {', 'cursor'),
        code(2, 'logs.forEach(log -> {'),
        ...perLog(build, 3),
        code(2, '});'),
        code(1, '}'),
      ];
    case 'pages':
      return [
        code(1, 'LogEntry last = null;', 'pages'),
        code(1, 'List<LogEntry> page;', 'pages'),
        code(1, 'while (!(page = repo.findPageAfter(id, last, 1_000)).isEmpty()) {', 'pages'),
        code(2, 'for (LogEntry log : page) {'),
        ...perLog(build, 3),
        code(2, '}'),
        code(2, 'last = page.getLast();', 'pages'),
        code(1, '}'),
      ];
  }
};

/** The method the player is building: the same code as the article, with holes where cards go. */
export const codeLines = (build: Build): readonly CodeLine[] => [
  code(0, 'void analyzeLogs(String id) {'),
  ...(build.write === 'batches'
    ? [{ kind: 'batch-size', indent: 1 } as const, code(1, 'List<RunSummary> batch = new ArrayList<>(batchSize);', 'batches')]
    : []),
  code(1, 'LogAnalyzer analyzer = new LogAnalyzer();'),
  ...readLines(build),
  ...(build.write === 'batches' ? [code(1, 'if (!batch.isEmpty()) write(batch);', 'batches')] : []),
  code(0, '}'),
];

export const javaNumber = (value: number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '_');
