import { CSSProperties, ImgHTMLAttributes, forwardRef } from 'react';

type ImageSource = string | { src: string };

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: ImageSource;
  alt: string;
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, fill, style, priority, unoptimized, loading, fetchPriority, ...rest },
  ref
) {
  const resolvedSrc = typeof src === 'string' ? src : src.src;
  const resolvedLoading = priority ? 'eager' : loading;
  const resolvedFetchPriority = priority ? 'high' : fetchPriority;
  const imgAttributes: Record<string, string> = {};
  if (resolvedFetchPriority) {
    imgAttributes.fetchpriority = resolvedFetchPriority;
  }

  // Keep Next.js-like semantics while preventing non-DOM props from being passed to <img>.
  void unoptimized;

  const mergedStyle: CSSProperties = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: (style as CSSProperties | undefined)?.objectFit ?? 'cover',
        ...style,
      }
    : { ...style };

  return (
    <img
      ref={ref}
      src={resolvedSrc}
      alt={alt}
      style={mergedStyle}
      loading={resolvedLoading}
      {...imgAttributes}
      {...rest}
    />
  );
});

export default Image;
