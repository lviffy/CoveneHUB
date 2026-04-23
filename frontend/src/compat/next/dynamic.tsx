import { ComponentType, Suspense, lazy } from 'react';

type Loader<TProps> = () => Promise<{ default: ComponentType<TProps> } | ComponentType<TProps>>;

type DynamicOptions<TProps> = {
  loading?: ComponentType;
  ssr?: boolean;
};

export default function dynamic<TProps>(loader: Loader<TProps>, options?: DynamicOptions<TProps>) {
  const LazyComponent = lazy(async () => {
    const module = await loader();
    if (typeof module === 'function') {
      return { default: module };
    }
    return module;
  });

  const LoadingComponent = options?.loading;

  return function DynamicComponent(props: TProps) {
    const ResolvedComponent = LazyComponent as unknown as ComponentType<any>;
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <ResolvedComponent {...(props as any)} />
      </Suspense>
    );
  };
}
