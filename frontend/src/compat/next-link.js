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
import { Link as RouterLink } from "react-router-dom";
const Link = /*#__PURE__*/ React.forwardRef(
  ({ href, children, prefetch: _prefetch, scroll: _scroll, ...props }, ref) => {
    return /*#__PURE__*/ React.createElement(
      RouterLink,
      _extends(
        {
          ref: ref,
          to: href,
        },
        props,
      ),
      children,
    );
  },
);
Link.displayName = "Link";
export default Link;
