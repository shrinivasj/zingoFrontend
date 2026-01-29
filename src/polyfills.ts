// Minimal polyfills for libraries expecting Node globals in the browser.
(window as any).global = window;
(window as any).process = (window as any).process || { env: {} };
