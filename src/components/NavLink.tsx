import { forwardRef } from 'react';
import { NavLink as RouterNavLink, type NavLinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

const linkToneClasses = {
  subtle: 'text-muted-foreground hover:text-foreground',
  primary: 'text-primary hover:text-primary/80',
  contrast: 'text-white/80 hover:text-white',
} as const;

interface AppNavLinkProps extends Omit<NavLinkProps, 'className'> {
  tone?: keyof typeof linkToneClasses;
}

const NavLink = forwardRef<HTMLAnchorElement, AppNavLinkProps>(
  ({ tone = 'subtle', to, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) =>
        cn(
          'transition-colors',
          linkToneClasses[tone],
          isActive && 'font-semibold text-foreground',
          isPending && 'opacity-70',
        )
      }
      {...props}
    />
  ),
);

NavLink.displayName = 'NavLink';

export { NavLink };
