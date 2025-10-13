'use client';

import { useRouter } from 'next/navigation';
import { Clock, LayoutDashboard, PackageOpen, Archive, ShoppingCart, SquareLibrary } from 'lucide-react';

type NavItem = 'dashboard' | 'inventory' | 'archive' | 'pos' | 'history' | 'records';

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
        onClick={() => router.replace('/dashboard')}
      >
        <LayoutDashboard className={classes.navIcon} />
        Dashboard
      </button>

      <button
        className={`${classes.navButton} ${activeClass('pos')}`}
        onClick={() => router.replace('/pos')}
      >
        <ShoppingCart className={classes.navIcon} />
        POS
      </button>

      <button
        className={`${classes.navButton} ${activeClass('inventory')}`}
        onClick={() => router.replace('/inventory')}
      >
        <PackageOpen className={classes.navIcon} />
        Inventory
      </button>

      <button
        className={`${classes.navButton} ${activeClass('archive')}`}
        onClick={() => router.replace('/archive')}
      >
        <Archive className={classes.navIcon} />
        {typeof archivedCount === 'number' ? `Archive (${archivedCount})` : 'Archive'}
      </button>

      <button
        className={`${classes.navButton} ${activeClass('history')}`}
        onClick={() => router.replace('/history')}
      >
        <Clock className={classes.navIcon} />
        History
      </button>

      <button
        className={`${classes.navButton} ${activeClass('records')}`}
        onClick={() => router.replace('/records')}
      >
        <SquareLibrary className={classes.navIcon} />
        Records
      </button>
    </nav>
  );
}