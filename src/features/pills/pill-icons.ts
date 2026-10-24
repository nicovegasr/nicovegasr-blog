// Original 40-unit drawings: solid silhouettes and real transparent cutouts.
// Each body path uses evenodd so its holes stay transparent in either theme.
export interface PillIconDrawing {
  body: readonly string[];
  signal?: string;
}

export const PILL_ICONS: Readonly<Record<string, PillIconDrawing>> = {
  api: {
    body: ['M3 9 10 2h9v10h-7v16h7v10h-9l-7-7Z', 'm37 9-7-7h-9v10h7v16h-7v10h9l7-7Z'],
    signal: 'M13 17h14v6H13Z',
  },
  server: {
    body: ['M13 5h14l8 8v14l-8 8H13l-8-8V13ZM12 17v6h9v5l10-8-10-8v5Z', 'M0 10h7v4H0Zm0 8h7v4H0Zm0 8h7v4H0ZM16 0h4v7h-4Zm8 0h4v7h-4ZM16 33h4v7h-4Zm8 0h4v7h-4Z'],
    signal: 'M33 17h7v6h-7Z',
  },
  database: {
    body: ['M4 10C4 5 11 2 20 2s16 3 16 8v20l-7 8H11l-7-8ZM4 15v4c8 5 24 5 32 0v-4c-8 5-24 5-32 0ZM4 24v4c8 5 24 5 32 0v-4c-8 5-24 5-32 0ZM11 32v2h5v-2Z'],
    signal: 'M9 10a11 3.5 0 1 0 22 0 11 3.5 0 1 0-22 0Z',
  },
  frontend: {
    body: ['M3 3h26l8 8v26H3ZM7 13v20h26V13ZM7 7v3h4V7Zm7 0v3h4V7Z', 'm15 17-7 6 7 6v-5l-2-1 2-1Zm10 0v5l2 1-2 1v5l7-6Z'],
    signal: 'M22 6h6l4 4H22Z',
  },
  network: {
    body: ['M14 2h12v10H14ZM2 28h10v10H2Zm13 0h10v10H15Zm13 0h10v10H28Z', 'M18 11h4v7h13v11h-4v-7h-9v7h-4v-7H9v7H5V18h13Z'],
    signal: 'M18 5h4v4h-4Z',
  },
  infrastructure: {
    body: ['M3 3h16v15H3ZM7 7v7h8V7ZM25 3h6l6 6v9H25ZM29 9v5h4V9Z', 'M9 18h4v10h14V18h4v14H9ZM2 35h36v4H2Z'],
    signal: 'M18 26h4v8h-4Z',
  },
  foundation: {
    body: ['M2 12 20 2l18 10v4H2ZM5 19h7v13H5Zm12 0h6v13h-6Zm11 0h7v13h-7ZM2 35h36v4H2Z'],
    signal: 'M17 8h6v5h-6Z',
  },
  layers: {
    body: ['M2 10 20 1l18 9-18 9ZM2 17l18 9 18-9v6l-18 9-18-9ZM2 28l18 9 18-9v5l-18 7-18-7Z'],
    signal: 'M12 10 20 6l8 4-8 4Z',
  },
  whale: {
    body: ['M2 19h25c5 0 7-5 7-9h5c0 10-5 24-21 24C9 34 3 29 2 19ZM26 23v3h3v-3Z', 'M4 11h6v6H4Zm8 0h6v6h-6Zm8 0h6v6h-6ZM12 3h6v6h-6Zm8 0h6v6h-6Z'],
    signal: 'M20 3h6v6h-6Z',
  },
  image: {
    body: ['M3 10 20 2l17 8v20l-17 8L3 30ZM7 12l13 6 13-6-13-6ZM7 17v10l11 5V22Zm15 5v10l11-5V17Z'],
    signal: 'm22 22 11-5v5l-11 5Z',
  },
  container: {
    body: ['M2 10 8 4h30v30H2ZM8 10v18h4V10Zm8 0v18h4V10Zm8 0v18h4V10Z'],
    signal: 'M32 10h3v18h-3Z',
  },
  dockerfile: {
    body: ['M5 2h21l9 9v27H5ZM24 5v9h8ZM10 18v4h19v-4Zm0 8v4h13v-4Z'],
    signal: 'M26 26h4v7h-4Z',
  },
  volume: {
    body: ['M3 10 11 2h18l8 8v22l-6 6H9l-6-6ZM9 9v20l4 3h14l4-3V9ZM14 12h12v13H14ZM16 15v7h8v-7Z'],
    signal: 'M16 29h8v5h-8Z',
  },
  compose: {
    body: ['M2 2h15v15H2ZM6 6v7h7V6ZM23 2h9l6 6v9H23ZM2 23h15v15H2ZM23 23h15v15H23ZM27 27v7h7v-7Z', 'M17 8h6v4h-6ZM8 17h4v6H8Zm20 0h4v6h-4Zm-11 11h6v4h-6Z'],
    signal: 'M27 7h5v5h-5Z',
  },
  registry: {
    body: ['M2 13 20 2l18 11v25H2ZM9 18v16h22V18ZM13 22h14v12H13ZM6 13v3h28v-3Z'],
    signal: 'M17 24h6v6h-6Z',
  },
  design: {
    body: ['M2 2h15v15H2ZM6 6v7h7V6ZM23 2h9l6 6v9H23ZM27 8v5h6V8Z', 'M8 17h4v9h16v-9h4v13H8ZM5 34h30v5H5Z'],
    signal: 'M18 22h4v12h-4Z',
  },
  kubernetes: {
    body: ['M20 1 36 10v20L20 39 4 30V10ZM20 7 10 13v14l10 6 10-6V13Z', 'M18 9h4v8l6-4 2 4-7 4 7 4-2 4-6-4v7h-4v-7l-6 4-2-4 7-4-7-4 2-4 6 4Z'],
    signal: 'M17 18h6v6h-6Z',
  },
  'cluster-cost': {
    body: ['M2 3h15v14H2ZM6 7v6h7V7ZM23 3h15v14H23ZM27 7v6h7V7Z', 'M8 17h4v8h16v-8h4v12H8ZM4 34h32v5H4Z'],
    signal: 'M17 22h6v12h-6Z',
  },
  'desired-state': {
    body: ['M2 2h15v15H2ZM6 6v7h7V6ZM23 23h15v15H23ZM27 27v7h7v-7Z', 'M18 7h15v10h5L31 25l-7-8h5v-6H18Z'],
    signal: 'M6 6h7v7H6Z',
  },
  pod: {
    body: ['M20 1 36 10v20L20 39 4 30V10ZM20 7 10 13v14l10 6 10-6V13ZM14 15h12v10H14ZM18 18v4h4v-4Z'],
    signal: 'M18 18h4v4h-4Z',
  },
  deployment: {
    body: ['M1 4h13v13H1ZM5 8v5h5V8ZM26 4h13v13H26ZM30 8v5h5V8Z', 'M14 8h12v4H14ZM5 17h4v10h22V17h4v14H5ZM17 23h6v8h5l-8 8-8-8h5Z'],
    signal: 'M17 6h6v8h-6Z',
  },
  config: {
    body: ['M5 2h22l8 8v28H5ZM10 11v4h20v-4Zm0 13v4h20v-4Z', 'M14 7h5v12h-5ZM22 20h5v12h-5Z'],
    signal: 'M22 22h5v8h-5Z',
  },
  probe: {
    body: ['M1 18h8l5-13 10 24 4-11h11v5h-8l-7 16-10-24-2 8H1Z'],
    signal: 'M0 17h6v7H0Z',
  },
  service: {
    body: ['M2 2h13v13H2ZM6 6v5h5V6ZM25 2h13v13H25ZM29 6v5h5V6ZM13 26h14v13H13ZM17 30v5h6v-5Z', 'M6 15h5v4h18v-4h5v9H22v3h-5v-3H6Z'],
    signal: 'M17 30h6v5h-6Z',
  },
  pipeline: {
    body: ['M1 1h13v13H1ZM5 5v5h5V5ZM14 14h12v12H14ZM18 18v4h4v-4ZM27 27h12v12H27ZM31 31v4h4v-4Z', 'm11 11 6 3-3 3-6-3Zm13 13 6 3-3 3-6-3Z'],
    signal: 'M31 31h4v4h-4Z',
  },
  gitops: {
    body: ['M5 2h6v24c0 4 2 6 6 6h14v-5l9 8-9 5v-4H17C9 36 5 32 5 26ZM14 8h19v17H14ZM18 12v9h11v-9Z'],
    signal: 'M2 2h12v7H2Z',
  },
  diagnosis: {
    body: ['M3 2h19l7 7v20H3ZM8 8v15h15V8ZM28 25l11 10-4 5-11-11Z', 'M11 12h9v4h-9Zm0 6h6v3h-6Z'],
    signal: 'M11 12h9v4h-9Z',
  },
  simple: {
    body: ['M6 5h28a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6Zm0 12h20a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6Zm0 12h10a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6Z'],
  },
  responsibility: {
    body: ['M20 3a17 17 0 1 0 0 34 17 17 0 0 0 0-34Zm0 6a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm0 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z'],
  },
  predictable: {
    body: ['M6 16h17v-6c0-2 2-3 3.5-1.5l10 10a2 2 0 0 1 0 3l-10 10C25 33 23 32 23 30v-6H6a4 4 0 0 1 0-8Z'],
  },
  cohesion: {
    // A magnet: two sides held together by one continuous body.
    body: ['M5 8a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v13a6 6 0 0 0 12 0V8a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v13a15 15 0 0 1-30 0ZM5 13v4h9v-4Zm21 0v4h9v-4Z'],
  },
  coupling: {
    body: ['M22 5a10 10 0 0 1 14 14l-7 7-4-4 7-7a4.3 4.3 0 0 0-6-6l-7 7-4-4ZM18 35A10 10 0 0 1 4 21l7-7 4 4-7 7a4.3 4.3 0 0 0 6 6l7-7 4 4Z', 'm12 24 12-12a2.8 2.8 0 0 1 4 4L16 28a2.8 2.8 0 0 1-4-4Z'],
  },
  snapshot: {
    body: ['M8 3h14a3 3 0 0 1 3 3v1H12a5 5 0 0 0-5 5v18H5a3 3 0 0 1-3-3V9a6 6 0 0 1 6-6Z', 'M15 10h12l9 9v15a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Zm10 2v9h9Zm-7 14v4h12v-4Z'],
  },
  'error-flow': {
    // Two explicit outcomes, without miniature punctuation inside the symbol.
    body: ['M8 3a3 3 0 0 1 3 3v6h15V8c0-1 1-2 2-1l9 7a2 2 0 0 1 0 3l-9 7c-1 1-2 0-2-1v-5H11v7a3 3 0 0 0 3 3h7v-4c0-1 1-2 2-1l7 5a2 2 0 0 1 0 3l-7 5c-1 1-2 0-2-1v-1h-7a9 9 0 0 1-9-9V6a3 3 0 0 1 3-3Z'],
  },
  retry: {
    // Waiting between attempts has a distinct silhouette from the TDD loop.
    body: ['M8 3h24a3 3 0 0 1 0 6H8a3 3 0 0 1 0-6Zm0 28h24a3 3 0 0 1 0 6H8a3 3 0 0 1 0-6Z', 'M10 9h20c0 6-3 8-6 11 3 3 6 5 6 11H10c0-6 3-8 6-11-3-3-6-5-6-11Zm6 4c1 3 2 4 4 5 2-1 3-2 4-5Zm4 11-5 6h10Z'],
  },
  testable: {
    body: ['M14 3h12a2 2 0 0 1 0 4h-1v9l11 15c2 3 0 6-3 6H7c-3 0-5-3-3-6l11-15V7h-1a2 2 0 0 1 0-4Zm5 4v11l-5 7h12l-5-7V7Zm-8 23v3h18v-3Z'],
  },
  tdd: {
    // The development loop has two opposed arrows, not the retry clock.
    body: ['M20 4A16 16 0 0 0 4 20h6a10 10 0 0 1 18-6h-5c-2 0-2.5 2-1 3l11 6c1 .5 3-.5 3-2V8c0-2-2-2.5-3-1l-1.5 2A16 16 0 0 0 20 4ZM30 20a10 10 0 0 1-18 6h5c2 0 2.5-2 1-3L7 17c-1-.5-3 .5-3 2v13c0 2 2 2.5 3 1l1.5-2A16 16 0 0 0 36 20Z'],
  },
  observability: {
    body: ['M1 20C10 3 30 3 39 20 30 37 10 37 1 20Zm7 0c7 10 17 10 24 0C25 10 15 10 8 20Zm12-7a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z'],
    signal: 'M17 17h6v6h-6Z',
  },
  logs: {
    body: ['M5 2h21l9 9v27H5ZM11 9v4h13V9Zm0 9v4h18v-4Zm0 9v4h12v-4Z'],
    signal: 'M26 27h4v7h-4Z',
  },
  telemetry: {
    body: ['M2 15h5v18H2ZM10 3h5v30h-5ZM18 20h5v13h-5ZM26 9h5v24h-5ZM34 22h5v11h-5ZM1 36h38v4H1Z'],
    signal: 'M10 3h5v9h-5Z',
  },
  loki: {
    body: ['M3 3h27l7 7v27H3ZM8 10v4h21v-4Zm0 9v4h15v-4Zm0 9v4h10v-4Z'],
    signal: 'M25 21v-6l13 11-13 11v-7h-6v-9Z',
  },
  metrics: {
    body: ['M2 2h5v31h31v5H2ZM10 25l9-12 7 5 8-12 5 3-12 17-7-5-6 8Z'],
    signal: 'M29 2h10v10h-5V7h-5Z',
  },
  traces: {
    body: ['M5 2h6v10h10v9h14v17h-6V27H15v-9H5Z', 'M1 1h14v10H1ZM25 29h14v10H25Z'],
    signal: 'M16 15h9v9h-9Z',
  },
  dashboard: {
    body: ['M2 3h28l8 8v26H2ZM7 9v5h26V9Zm0 10v13h8V19Zm13 0v13h13V19Z', 'M23 23h7v5h-7Z'],
    signal: 'M7 19h8v13H7Z',
  },
  alert: {
    body: ['M20 2c-8 0-12 6-12 14v6L2 32h36l-6-10v-6C32 8 28 2 20 2ZM15 35h10v5H15Z'],
    signal: 'M17 9h6v12h-6Zm0 15h6v5h-6Z',
  },
  summary: {
    body: ['M5 3h30v6H15l11 11-11 11h20v6H5v-7l10-10L5 10Z'],
    signal: 'M29 17h6v6h-6Z',
  },
};
