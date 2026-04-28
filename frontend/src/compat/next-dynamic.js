function _extends() {
  return (
    (_extends = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e];
            for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
          }
          return n;
        }),
    _extends.apply(null, arguments)
  );
}
import React, { Suspense } from "react";
function normalizeModule(mod) {
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return mod;
  }
  return {
    default: mod,
  };
}
export default function dynamic(loader, options = {}) {
  const LazyComponent = /*#__PURE__*/ React.lazy(async () =>
    normalizeModule(await loader()),
  );
  const LoadingComponent = options.loading;
  const DynamicComponent = /*#__PURE__*/ React.forwardRef((props, ref) =>
    /*#__PURE__*/ React.createElement(
      Suspense,
      {
        fallback: LoadingComponent
          ? /*#__PURE__*/ React.createElement(LoadingComponent, null)
          : null,
      },
      /*#__PURE__*/ React.createElement(
        LazyComponent,
        _extends({}, props, {
          ref: ref,
        }),
      ),
    ),
  );
  DynamicComponent.displayName = "DynamicComponent";
  return DynamicComponent;
}
