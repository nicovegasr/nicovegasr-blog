import { findContentDemo } from './registry';

class ContentDemo extends HTMLElement {
  private dispose: (() => void) | undefined;
  private loading = false;

  connectedCallback() {
    void this.load();
  }

  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
    delete this.dataset.demoStatus;
  }

  private async load() {
    if (this.loading || this.dispose) return;
    const loadModule = findContentDemo(this.getAttribute('name') ?? '');
    if (!loadModule) return;
    this.loading = true;
    this.dataset.demoStatus = 'loading';
    const locale = this.closest('[lang]')?.getAttribute('lang')?.startsWith('en') ? 'en' : 'es';
    const fallback = [...this.childNodes].map((node) => node.cloneNode(true));

    try {
      const demo = await loadModule();
      if (!this.isConnected) return;
      this.dispose = demo.mount(this, locale);
      this.dataset.demoStatus = 'ready';
    } catch {
      this.replaceChildren(...fallback);
      this.dataset.demoStatus = 'error';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = locale === 'es' ? 'Volver a cargar la animación' : 'Reload animation';
      retry.addEventListener('click', () => { retry.remove(); void this.load(); }, { once: true });
      this.append(retry);
    } finally {
      this.loading = false;
    }
  }
}

if (!customElements.get('content-demo')) customElements.define('content-demo', ContentDemo);
