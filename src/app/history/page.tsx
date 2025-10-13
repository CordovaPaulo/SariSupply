'use client';

import { use, useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import NavBar from '@/components/NavBar/NavBar';
import styles from './page.module.css';
import PageLoader from '@/components/PageLoader/PageLoader';
import LogoutConfirmation from '@/components/logoutConfirmation/logout';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/ThemeToggle';
import AddProductPopup from '../../components/AddProductPopup/AddProductPopup';
import { toast } from 'react-toastify';

type Line = { name: string; unitPrice: number; quantity: number; subtotal: number };
type HistoryDoc = {
  _id: string;
  createdAt?: string;
  items: Line[];
  totals: { quantity: number; amount: number };
  payment?: { amountPaid: number; change: number; currency?: string };
  type?: string;
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const router = useRouter();
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [userName, setUserName] = useState('User'); // added

  const handleAddProduct = () => setShowAddPopup(true);
  const handleClosePopup = () => setShowAddPopup(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);
  const handleProductAdded = () => {
    setShowAddPopup(false);
  }

  const handleCancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirmation(false);
    router.replace('/');
  };

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // send authToken cookie
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response:', responseData);

        if (responseData.user?.mustChangePassword) {
          router.replace(`/account/change-password?returnTo=${encodeURIComponent('/history')}`);
          return;
        }
        
        setUser(responseData.user);
        setIsAuthenticated(true);
        // ...existing code...
      } else {
        // ...existing code...
        setLoading(false);
        router.replace('/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoading(false);
      router.replace('/');
      // ...existing code...
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/main/history', {
          credentials: 'include'
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || 'Failed to load history');
        }
        const json = await res.json();
        setData(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    run();
    checkAuthentication();
  }, []);

   if (loading) {
      return <PageLoader message="Loading dashboard..." />;
    }
  
  if (error) return <div className={styles.errorMessage}>{error}</div>;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Store className={styles.storeIcon} />
          <div className={styles.headerName}>
            {/* use decoded username */}
            <h1>{user?.username}</h1>
            <p>Recent transactions</p>
          </div>
        </div>
        <NavBar
          active="history"
          classes={{ nav: styles.nav, navButton: styles.navButton, navIcon: styles.navIcon, active: styles.active }}
        />
        <div className={styles.headerRight}>
          <ThemeToggle />
          <button 
            className={styles.addButton}
            onClick={handleAddProduct}
          >
            + Add Product
          </button>
          <button 
            className={styles.logoutButton}
            onClick={() => setShowLogoutConfirmation(true)}
          >
            Logout
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {data.length === 0 ? (
          <div className={styles.emptyState}>No transactions found.</div>
        ) : (
          <div className={styles.cardGrid}>
            {data.map((h) => (
              <div key={h._id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardDate}>
                    <strong>{new Date(h.createdAt || Date.now()).toLocaleString()}</strong>
                  </div>
                  <div className={styles.cardTotal}>Total: {formatCurrency(h.totals?.amount || 0)}</div>
                </div>

                <ul className={styles.itemList} role="list">
                  {h.items?.map((l, idx) => (
                    <li key={idx} className={styles.itemRow}>
                      <div className={styles.itemLeft}>
                        <div className={styles.itemName}>{l.name}</div>
                        <div className={styles.itemMeta}>
                          {l.quantity} x {formatCurrency(l.unitPrice)}
                        </div>
                      </div>
                      <div className={styles.itemAmount}>{formatCurrency(l.subtotal)}</div>
                    </li>
                  ))}
                </ul>

                {h.payment && (
                  <div className={styles.paymentSummary}>
                    <div className={styles.paymentRow}>
                      <span>Paid</span>
                      <strong>{formatCurrency(h.payment.amountPaid)}</strong>
                    </div>
                    <div className={styles.paymentRow}>
                      <span>Change</span>
                      <strong>{formatCurrency(h.payment.change)}</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <AddProductPopup
        isOpen={showAddPopup}
        onClose={handleClosePopup}
        onProductAdded={handleProductAdded}
      />
      <LogoutConfirmation
        isOpen={showLogoutConfirmation}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}