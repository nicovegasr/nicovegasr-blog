import type { Locale } from '@/i18n/locale';

export const labelsFor = (
  locale: Locale,
): {
  caption: string;
  enlarge: string;
  close: string;
  svgText: Record<string, string>;
} =>
  locale === 'es'
    ? {
        caption: 'La conexión depende de la red y del firewall; ejecutar código requiere explotar una vulnerabilidad.',
        enlarge: 'Ampliar ilustración',
        close: 'Cerrar ilustración',
        svgText: {},
      }
    : {
        caption:
          'The connection depends on the network and firewall; code execution requires exploiting a vulnerability.',
        enlarge: 'Enlarge illustration',
        close: 'Close illustration',
        svgText: {
          title: 'A local application on public Wi-Fi',
          description:
            'Another device on the same Wi-Fi attempts to connect to a Node application listening on all interfaces. A request exploiting a vulnerability could allow code execution. A separate service bound to 127.0.0.1:4321 blocks this direct access from Wi-Fi. Access also depends on firewall rules and client isolation; listening on all interfaces does not imply internet access.',
          network: 'Wi-Fi network',
          other: 'Another device',
          sameWifi: 'on the same Wi-Fi',
          node: 'Node app',
          possible: 'Possible',
          execution: 'code',
          code: 'execution',
          local: 'Local service',
          publicWifi: 'Public Wi-Fi',
          connection: 'Connect to',
          vulnerable: 'Vulnerable app',
          processes: 'processes request',
          loopbackOne: '127.0.0.1 is only accessible',
          loopbackTwo: 'from this Mac',
        },
      };
