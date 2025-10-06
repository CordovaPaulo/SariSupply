'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard, PackageOpen, Archive, ShoppingCart } from 'lucide-react';

type NavItem = 'dashboard' | 'inventory' | 'archive' | 'pos';

interface NavBarClasses {
  nav: string;
  navButton: string;
  navIcon: string;
  active?: string;
}

interface NavBarProps {
  active: NavItem;
  archivedCount?: number;
  classes: NavBarClasses;
}

export default function NavBar({ active, archivedCount, classes }: NavBarProps) {
  const router = useRouter();
  const activeClass = (key: NavItem) => (active === key ? classes.active ?? '' : '');

  return (
    <nav className={classes.nav}>
      <button
        className={`${classes.navButton} ${activeClass('dashboard')}`}
        onClick={() => router.push('/dashboard')}
      >
        <LayoutDashboard className={classes.navIcon} />
        Dashboard
      </button>

      <button
        className={`${classes.navButton} ${activeClass('pos')}`}
        onClick={() => router.push('/pos')}
      >
        <ShoppingCart className={classes.navIcon} />
        POS
      </button>

      <button
        className={`${classes.navButton} ${activeClass('inventory')}`}
        onClick={() => router.push('/inventory')}
      >
        <PackageOpen className={classes.navIcon} />
        Inventory
      </button>

      <button
        className={`${classes.navButton} ${activeClass('archive')}`}
        onClick={() => router.push('/archive')}
      >
        <Archive className={classes.navIcon} />
        {typeof archivedCount === 'number' ? `Archive (${archivedCount})` : 'Archive'}
      </button>
    </nav>
  );
}