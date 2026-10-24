import type { Locale } from '@/i18n/locale';

// The system design series follows one inventory system as it grows. Each
// stage names the pill that introduces a piece; a pill shows every piece
// introduced up to its own stage and highlights the ones it adds.
export const SYSTEM_MAP_STAGES = [
  'kiss',
  'srp',
  'least-surprise',
  'immutability',
  'cohesion',
  'error-handling',
  'creational-patterns',
  'coupling',
  'async-retries',
  'design-for-testing',
  'tdd',
] as const;

export type SystemMapStage = (typeof SYSTEM_MAP_STAGES)[number];

type LocalizedText = Record<Locale, string>;

type SystemPiece = {
  readonly code?: string;
  readonly label: LocalizedText;
  readonly introducedAt: SystemMapStage;
};

type SystemArea = {
  readonly name: LocalizedText;
  readonly pieces: readonly SystemPiece[];
};

const SYSTEM_AREAS: readonly SystemArea[] = [
  {
    name: { es: 'Entrada', en: 'Input' },
    pieces: [
      { label: { es: 'JSON de cada proveedor', en: 'JSON from each supplier' }, introducedAt: 'kiss' },
    ],
  },
  {
    name: { es: 'Importación', en: 'Import' },
    pieces: [
      { code: 'InventoryReader', label: { es: 'Un lector por formato', en: 'One reader per format' }, introducedAt: 'kiss' },
      { code: 'InventoryRecord', label: { es: 'Reglas del inventario', en: 'Inventory rules' }, introducedAt: 'srp' },
      { code: 'preview / confirm', label: { es: 'Ver antes de importar', en: 'Review before importing' }, introducedAt: 'least-surprise' },
      { code: 'ImportPolicy', label: { es: 'Configuración fija por ejecución', en: 'Configuration fixed per run' }, introducedAt: 'immutability' },
    ],
  },
  {
    name: { es: 'Inventario', en: 'Inventory' },
    pieces: [
      { label: { es: 'Cron jobs: importar, conciliar, exportar', en: 'Cron jobs: import, reconcile, export' }, introducedAt: 'kiss' },
      { code: 'product.discontinue()', label: { es: 'Descatalogar en un solo sitio', en: 'Discontinue in one place' }, introducedAt: 'cohesion' },
      { code: 'Result', label: { es: 'Alertas de stock', en: 'Stock alerts' }, introducedAt: 'error-handling' },
    ],
  },
  {
    name: { es: 'Informes', en: 'Reports' },
    pieces: [
      { code: 'Builder · Factory', label: { es: 'Informes en CSV o PDF', en: 'CSV or PDF reports' }, introducedAt: 'creational-patterns' },
      { code: 'ReportArchive', label: { es: 'Archivo en varios destinos', en: 'Archive to several destinations' }, introducedAt: 'coupling' },
      { code: 'reportId', label: { es: 'Cola y reintentos idempotentes', en: 'Queue and idempotent retries' }, introducedAt: 'async-retries' },
    ],
  },
  {
    name: { es: 'Precios', en: 'Pricing' },
    pieces: [
      { code: 'calculateCampaignPrice', label: { es: 'Campañas por fechas', en: 'Date-based campaigns' }, introducedAt: 'design-for-testing' },
      { label: { es: 'Varias campañas y precio mínimo', en: 'Several campaigns and a minimum price' }, introducedAt: 'tdd' },
    ],
  },
];

export type SystemMapPiece = {
  readonly code: string | undefined;
  readonly label: string;
  readonly isNew: boolean;
};

export type SystemMapArea = {
  readonly name: string;
  readonly pieces: readonly SystemMapPiece[];
};

export const isSystemMapStage = (value: string): value is SystemMapStage =>
  (SYSTEM_MAP_STAGES as readonly string[]).includes(value);

export const systemMapAt = (
  stage: SystemMapStage,
  locale: Locale,
): SystemMapArea[] => {
  const position = SYSTEM_MAP_STAGES.indexOf(stage);
  return SYSTEM_AREAS.map((area) => ({
    name: area.name[locale],
    pieces: area.pieces
      .filter((piece) => SYSTEM_MAP_STAGES.indexOf(piece.introducedAt) <= position)
      .map((piece) => ({
        code: piece.code,
        label: piece.label[locale],
        isNew: piece.introducedAt === stage,
      })),
  })).filter((area) => area.pieces.length > 0);
};
