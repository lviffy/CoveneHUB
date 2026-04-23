import { ScriptHTMLAttributes, useEffect } from 'react';

interface ScriptProps extends ScriptHTMLAttributes<HTMLScriptElement> {
  strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive';
}

export default function Script({ src, strategy, ...rest }: ScriptProps) {
  useEffect(() => {
    if (!src) {
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = strategy !== 'beforeInteractive';

    if (rest.id) script.id = rest.id;
    if (rest.crossOrigin) script.crossOrigin = rest.crossOrigin;
    if (rest.type) script.type = rest.type;
    if (rest.integrity) script.integrity = rest.integrity;
    if (rest.referrerPolicy) script.referrerPolicy = rest.referrerPolicy;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [src, strategy, rest.id, rest.crossOrigin, rest.type, rest.integrity, rest.referrerPolicy]);

  return null;
}
