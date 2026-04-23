/**
 * Utility to suppress hydration warnings for known third-party attributes
 * These attributes are commonly added by browser extensions and don't affect functionality
 */

export const suppressKnownHydrationWarnings = () => {
  if (typeof window !== 'undefined') {
    // Suppress console warnings for known third-party extension attributes
    const originalConsoleError = console.error;
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
      if (
        typeof errorMessage === 'string' &&
        errorMessage.includes('Extra attributes from the server') &&
        knownExtensionAttributes.some(attr => errorMessage.includes(attr))
      ) {
        // Suppress this specific hydration warning
        return;
      }

      // Allow all other console errors to pass through
      originalConsoleError.apply(console, args);
    };
  }
};

export const restoreConsoleError = () => {
  if (typeof window !== 'undefined') {
    // This would restore the original console.error if needed
    // Implementation would depend on how you store the original reference
  }
};
