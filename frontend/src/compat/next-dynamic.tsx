import React, { Suspense } from 'react';

type DynamicOptions = {
  loading?: React.ComponentType;
  ssr?: boolean;
};

function normalizeModule<T extends React.ComponentType<any>>(
  mod: T | { default: T }
): { default: T } {
  if (typeof mod === 'object' && mod !== null && 'default' in mod) {
    return mod;
  }

  return { default: mod as T };
}

export default function dynamic<T extends React.ComponentType<any>>(
  loader: () => Promise<T | { default: T }>,
  options: DynamicOptions = {}
) {
  const LazyComponent = React.lazy(async () => normalizeModule(await loader()));
  const LoadingComponent = options.loading;

  const DynamicComponent = React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));

  DynamicComponent.displayName = 'DynamicComponent';

  return DynamicComponent;
}
