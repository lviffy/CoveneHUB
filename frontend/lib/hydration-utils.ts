/**
 * Utility to suppress hydration warnings for known third-party attributes
 * These attributes are commonly added by browser extensions and don't affect functionality
 */

let originalConsoleError: typeof console.error | null = null;
let isConsolePatched = false;

export const suppressKnownHydrationWarnings = () => {
  if (typeof window === 'undefined' || isConsolePatched) {
    return;
  }

  // Suppress console warnings for known third-party extension attributes
  originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Known third-party extension attributes that cause hydration warnings
    const knownExtensionAttributes = [
      'cz-shortcut-listen', // ColorZilla extension
      'data-new-gr-c-s-check-loaded', // Grammarly
      'data-gr-ext-installed', // Grammarly
      'spellcheck', // Browser spellcheck variations
      'autocomplete', // Browser autocomplete variations
      'data-1p-ignore', // 1Password extension
      'data-lastpass-icon-root', // LastPass extension
    ];

    const errorMessage = args[0];
    const messageText = typeof errorMessage === 'string' ? errorMessage : '';
    const argsText = args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');

    if (
      messageText.includes('Extra attributes from the server') &&
      knownExtensionAttributes.some((attr) => messageText.includes(attr))
    ) {
      // Suppress known browser-extension hydration warnings.
      return;
    }

    if (
      messageText.includes('Support for defaultProps will be removed from function components in a future major release') &&
      (messageText.includes('XAxis') || messageText.includes('YAxis') || argsText.includes('recharts'))
    ) {
      // Suppress known Recharts React deprecation warnings until upstream package update.
      return;
    }

    // Allow all other console errors to pass through.
    originalConsoleError?.apply(console, args);
  };

  isConsolePatched = true;
};

export const restoreConsoleError = () => {
  if (typeof window === 'undefined' || !isConsolePatched || !originalConsoleError) {
    return;
  }

  console.error = originalConsoleError;
  originalConsoleError = null;
  isConsolePatched = false;
};
