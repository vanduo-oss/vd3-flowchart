// Shared jsdom stubs, installed once (registered via vitest `setupFiles`).
//
// Everything here is guarded on `typeof window !== 'undefined'`, so plain-node
// specs (pure layout helpers) run against a pristine global and any accidental
// DOM dependency in code that must stay runtime-agnostic still fails loudly.
// jsdom implements none of the APIs stubbed below.
//
// Trade-off (accepted): these stubs can mask real API misuse — the Playwright
// smoke exercises the same code paths against the real browser APIs.

if (typeof window !== 'undefined') {
  // ResizeObserver — jsdom ships none. Harmless if unused; flowchart mainly needs a real window.
  if (!('ResizeObserver' in globalThis)) {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false;
        },
      }) as unknown as MediaQueryList;
  }
}
