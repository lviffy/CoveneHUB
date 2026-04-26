import React from 'react';

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | { src: string };
  alt: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  unoptimized?: boolean;
};

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      alt,
      fill = false,
      priority = false,
      quality: _quality,
      placeholder: _placeholder,
      blurDataURL: _blurDataURL,
      unoptimized: _unoptimized,
      style,
      width,
      height,
      loading,
      ...props
    },
    ref
  ) => {
    const resolvedSrc = typeof src === 'string' ? src : src.src;
    const fillStyle = fill
      ? {
          position: 'absolute' as const,
          inset: 0,
          width: '100%',
          height: '100%',
        }
      : {};

    return (
      <img
        ref={ref}
        src={resolvedSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? 'eager' : loading}
        style={{
          ...fillStyle,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Image.displayName = 'Image';

export default Image;
