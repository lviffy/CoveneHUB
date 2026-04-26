import React from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';

export type LinkProps = Omit<RouterLinkProps, 'to'> & {
  href: RouterLinkProps['to'];
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<LinkProps>>(
  ({ href, children, prefetch: _prefetch, scroll: _scroll, ...props }, ref) => {
    return (
      <RouterLink ref={ref} to={href} {...props}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = 'Link';

export default Link;
