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
import React from "react";
const Image = /*#__PURE__*/ React.forwardRef(
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
    ref,
  ) => {
    const resolvedSrc = typeof src === "string" ? src : src.src;
    const fillStyle = fill
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }
      : {};
    return /*#__PURE__*/ React.createElement(
      "img",
      _extends(
        {
          ref: ref,
          src: resolvedSrc,
          alt: alt,
          width: fill ? undefined : width,
          height: fill ? undefined : height,
          loading: priority ? "eager" : loading,
          style: {
            ...fillStyle,
            ...style,
          },
        },
        props,
      ),
    );
  },
);
Image.displayName = "Image";
export default Image;
