import { describe, expect, it } from 'vitest';
import { isSystemMapStage, systemMapAt } from './system-map';

const areaNames = (stage: Parameters<typeof systemMapAt>[0]) =>
  systemMapAt(stage, 'es').map((area) => area.name);

describe('systemMapAt', () => {
  it('shows only the initial system at the first stage, all of it new', () => {
    const map = systemMapAt('kiss', 'es');
    expect(map.map((area) => area.name)).toEqual(['Entrada', 'Importación', 'Inventario']);
    expect(map.flatMap((area) => area.pieces).every((piece) => piece.isNew)).toBe(true);
  });

  it('keeps earlier pieces and highlights only the ones the stage adds', () => {
    const pieces = systemMapAt('srp', 'es').flatMap((area) => area.pieces);
    expect(pieces.filter((piece) => piece.isNew).map((piece) => piece.code)).toEqual([
      'InventoryRecord',
    ]);
    expect(pieces.some((piece) => piece.code === 'InventoryReader' && !piece.isNew)).toBe(true);
  });

  it('hides areas until a piece in them has been introduced', () => {
    expect(areaNames('error-handling')).not.toContain('Informes');
    expect(areaNames('creational-patterns')).toContain('Informes');
  });

  it('shows the whole system at the last stage', () => {
    expect(areaNames('tdd')).toEqual(['Entrada', 'Importación', 'Inventario', 'Informes', 'Precios']);
  });

  it('localizes area names and labels', () => {
    const [input] = systemMapAt('kiss', 'en');
    expect(input).toEqual({
      name: 'Input',
      pieces: [{ code: undefined, label: 'JSON from each supplier', isNew: true }],
    });
  });
});

describe('isSystemMapStage', () => {
  it('accepts known stages only', () => {
    expect(isSystemMapStage('srp')).toBe(true);
    expect(isSystemMapStage('docker')).toBe(false);
  });
});
