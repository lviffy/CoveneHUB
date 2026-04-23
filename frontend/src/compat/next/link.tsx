import { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  shallow?: boolean;
}

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:');
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, children, scroll: _scroll, prefetch: _prefetch, shallow: _shallow, ...props },
  ref
) {
  if (isExternalHref(href) || href.startsWith('#')) {
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={href} replace={replace} ref={ref} {...props}>
      {children}
    </RouterLink>
  );
});

export default Link;
