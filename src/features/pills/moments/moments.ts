import type { Locale } from '@/i18n/locale';
import type { MomentStage } from './moment-stage';

type Action = { readonly label: string; readonly next: number };
export type MomentFrame = {
  readonly badge: string;
  readonly detail: string;
  readonly note: string;
  readonly tone?: 'success' | 'blocked';
  readonly previous?: string;
  readonly actions: readonly Action[];
};
export type Moment = {
  readonly title: string;
  readonly frames: readonly MomentFrame[];
};

// Small, local scenarios. Nothing is uploaded or saved outside this card.
export function momentFor(stage: MomentStage, locale: Locale): Moment | undefined {
  const t = (es: string, en: string) => locale === 'es' ? es : en;
  switch (stage) {
    case 'kiss':
      return {
        title: t('Una entrada, distintos formatos', 'One input, different formats'),
        frames: [
          { badge: 'stock.json', detail: t('Elige un proveedor', 'Choose a supplier'),
            note: t('Cada uno envía su propio JSON.', 'Each sends its own JSON.'),
            actions: [{ label: t('Proveedor Norte', 'North supplier'), next: 1 }, { label: t('Proveedor Sur', 'South supplier'), next: 2 }] },
          { badge: t('Proveedor Norte', 'North supplier'), detail: t('A1234567 · 3 unidades', 'A1234567 · 3 units'),
            note: t('Su lector lo traduce al inventario común.', 'Its reader translates it into the shared inventory.'), tone: 'success',
            actions: [{ label: t('Probar Sur', 'Try South'), next: 2 }] },
          { badge: t('Proveedor Sur', 'South supplier'), detail: t('A1234567 · 3 unidades', 'A1234567 · 3 units'),
            note: t('Otro formato, el mismo registro de inventario.', 'Different format, the same inventory record.'), tone: 'success',
            actions: [{ label: t('Probar Norte', 'Try North'), next: 1 }] },
        ],
      };
    case 'srp':
      return {
        title: t('Una regla para todos', 'One rule for everyone'),
        frames: [
          { badge: 'ABC123', detail: t('Norte: válido · Sur: válido', 'North: valid · South: valid'),
            note: t('Por ahora, basta con que el código esté presente.', 'For now, the code only needs to be present.'),
            actions: [{ label: t('Exigir 8 caracteres', 'Require 8 characters'), next: 1 }] },
          { badge: 'ABC123 · 6 / 8', detail: t('Norte: rechazado · Sur: rechazado', 'North: rejected · South: rejected'),
            note: t('Cambia la regla del registro. Los lectores siguen igual.', 'The record rule changes. The readers stay the same.'), tone: 'blocked', actions: [] },
        ],
      };
    case 'immutability':
      return {
        title: t('Un reintento limpio', 'A clean retry'),
        frames: [
          { badge: 'stock.json', detail: t('Fallido · timeout', 'Failed · timeout'),
            note: t('El fichero no se pudo leer.', 'The file could not be read.'),
            actions: [{ label: t('Reintentar', 'Retry'), next: 1 }] },
          { badge: 'stock.json', detail: t('Completado · sin error', 'Completed · no error'),
            previous: t('Anterior: fallido · timeout', 'Previous: failed · timeout'),
            note: t('Un objeto nuevo. El anterior conserva su error.', 'A new object. The previous one keeps its error.'), tone: 'success', actions: [] },
        ],
      };
    case 'cohesion':
      return {
        title: t('Un momento en el catálogo', 'A moment in the catalog'),
        frames: [
          { badge: t('Taza de cerámica', 'Ceramic mug'), detail: t('En catálogo · 3 unidades', 'Listed · 3 units'),
            note: t('Desde el panel de administración.', 'From the administration dashboard.'),
            actions: [{ label: t('Descatalogar', 'Discontinue'), next: 1 }] },
          { badge: t('Taza de cerámica', 'Ceramic mug'), detail: t('En catálogo · 3 unidades', 'Listed · 3 units'),
            note: t('Todavía quedan unidades. El producto sigue en catálogo.', 'Units remain. The product stays listed.'), tone: 'blocked',
            actions: [{ label: t('Vender las 3 unidades', 'Sell the 3 units'), next: 2 }] },
          { badge: t('Taza de cerámica', 'Ceramic mug'), detail: t('En catálogo · sin stock', 'Listed · out of stock'),
            note: t('Ya se puede descatalogar.', 'It can now be discontinued.'),
            actions: [{ label: t('Descatalogar', 'Discontinue'), next: 3 }] },
          { badge: t('Taza de cerámica', 'Ceramic mug'), detail: t('Descatalogado · sin stock', 'Discontinued · out of stock'),
            note: t('Ya no aparece entre los productos a la venta.', 'It no longer appears among the products for sale.'), tone: 'success', actions: [] },
        ],
      };
    case 'coupling':
      return {
        title: t('El mismo informe, otro destino', 'Same report, another destination'),
        frames: [
          { badge: 'inventario.csv', detail: t('Listo para archivar', 'Ready to archive'),
            note: t('El contenido del informe ya está calculado.', 'The report content is already calculated.'),
            actions: [{ label: t('Guardar en objetos', 'Save to object storage'), next: 1 }, { label: t('Guardar en archivo local', 'Save to local archive'), next: 2 }] },
          { badge: 'inventario.csv', detail: t('Guardado en objetos', 'Saved to object storage'),
            note: t('Cambia el destino; el informe sigue igual.', 'The destination changes; the report stays the same.'), tone: 'success',
            actions: [{ label: t('Usar archivo local', 'Use local archive'), next: 2 }] },
          { badge: 'inventario.csv', detail: t('Guardado en archivo local', 'Saved to local archive'),
            note: t('Otro destino; el mismo contenido.', 'Another destination; the same content.'), tone: 'success',
            actions: [{ label: t('Usar objetos', 'Use object storage'), next: 1 }] },
        ],
      };
    case 'async-retries':
      return {
        title: t('La respuesta se pierde', 'The response gets lost'),
        frames: [
          { badge: 'informe-042.csv', detail: t('Pendiente de archivar', 'Waiting to be archived'),
            note: t('Una clave estable para todos los intentos.', 'One stable key for every attempt.'),
            actions: [{ label: t('Archivar informe', 'Archive report'), next: 1 }] },
          { badge: 'informe-042.csv', detail: t('Timeout · 1 fichero en destino', 'Timeout · 1 file at destination'),
            note: t('Se guardó, pero no llegó la confirmación.', 'It was saved, but the confirmation never arrived.'), tone: 'blocked',
            actions: [{ label: t('Reintentar', 'Retry'), next: 2 }] },
          { badge: 'informe-042.csv', detail: t('Confirmado · 1 fichero en destino', 'Confirmed · 1 file at destination'),
            note: t('La misma clave sobrescribe el fichero. No hay duplicado.', 'The same key overwrites the file. No duplicate.'), tone: 'success', actions: [] },
        ],
      };
    default:
      return undefined;
  }
}
