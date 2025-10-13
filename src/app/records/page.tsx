'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import NavBar from '../../components/NavBar/NavBar';
import ThemeToggle from '@/components/theme/ThemeToggle';
import AddRecordPopup from '../../components/addRecordPopup/addRecordPopup';
import { Store, Eye } from 'lucide-react';
import LogoutConfirmation from '@/components/logoutConfirmation/logout';  
import { useRouter } from 'next/navigation';  
import ViewRecordPopup from '../../components/viewRecordPopup/viewRecordPopup';
import PageLoader from '../../components/PageLoader/PageLoader';
import { toast } from 'react-toastify';
import ScrollLock from '@/components/ScrollLock/ScrollLock';

type RecordItem = {
  _id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt?: string | Date;
};

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [viewing, setViewing] = useState<RecordItem | null>(null);
  const router = useRouter();
  const [userName, setUserName] = useState('User'); // added
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);

  const checkAuthentication = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include', 
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('API Response:', responseData);

          if (responseData.user?.mustChangePassword) {
            router.replace(`/account/change-password?returnTo=${encodeURIComponent('/records')}`);
            return;
          }
          
          setUser(responseData.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          setLoading(false);
          router.replace('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setLoading(false);
        router.replace('/');
      }
    };
  const loadRecords = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/main/record/fetch', {
        credentials: 'include',
      });
      const json = await res.json();

      if (res.ok && json?.success) {
        const list: RecordItem[] = Array.isArray(json.data) ? json.data : [];
        list.sort((a, b) => {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
        setRecords(list);
        // toast.success('Records loaded successfully.');
      } else {
        setError(json?.message || 'Failed to load records');
        toast.error('Failed to load records');
      }
    } catch {
      setError('Network error occurred');
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    checkAuthentication();
  }, []);

  const handleRecordAdded = () => {
    loadRecords();
  };

  const formatDate = (date?: string | Date) =>
    date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        })
    : '';

    const handleLogout = () => {
        setShowLogoutConfirmation(true);
    };

    if (loading) {
      return <PageLoader message="Loading records..." />;
    }

    const handleConfirmLogout = () => {
        localStorage.removeItem('token');
        setShowLogoutConfirmation(false);
        router.replace('/');
    };

    const handleCancelLogout = () => setShowLogoutConfirmation(false);

    // state: showAdd, viewing (record or null), showLogoutConfirmation
    const anyModalOpen = Boolean(showAdd || viewing || showLogoutConfirmation);

    return (
        <div className={styles.dashboard}>
          <ScrollLock active={anyModalOpen} />
        <header className={styles.header}>
            <div className={styles.headerLeft}>
            <Store className={styles.storeIcon} />
            <div className={styles.headerName}>
                {/* use decoded username */}
                <h1 className={styles.logo}>{user?.username}</h1>
                <p>Uploaded receipts and notes</p>
            </div>
            </div>

            <NavBar
            active="records"
            classes={{
                nav: styles.nav,
                navButton: styles.navButton,
                navIcon: styles.navIcon,
                active: styles.active,
            }}
            />

            <div className={styles.headerRight}>
            <ThemeToggle />
            <button className={styles.addButton} onClick={() => setShowAdd(true)}>
                + Add Record
            </button>
            <button
              className={styles.logoutButton}
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
            </div>
        </header>

        <main className={styles.main}>
            <section className={styles.recentSection}>
            <div className={styles.sectionHeader}>
                <h2>Recent Records</h2>
                <button
                className={styles.viewAllButton}
                onClick={() => loadRecords()}
                aria-label="Refresh list"
                >
                Refresh
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                <div className={styles.emptyState}>
                    <p>Loading records…</p>
                </div>
                ) : error ? (
                <div className={`${styles.emptyState} ${styles.errorMessage}`}>
                    <p>No records found</p>
                </div>
                ) : records.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No records yet</p>
                    <p>Add your first record to get started</p>
                    <button className={styles.addFirstButton} onClick={() => setShowAdd(true)}>
                    Add Your First Record
                    </button>
                </div>
                ) : (
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Image</th>
                        <th>Date Added</th>
                        <th className={styles.actionsHeader}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, idx) => (
                        <tr key={r._id ?? idx}>
                          <td>
                            <div className={styles.productCell}>
                              <strong>{r.title}</strong>
                            </div>
                          </td>
                          <td className={styles.descriptionCell}>
                            <span className={styles.productDescription}>{r.description}</span>
                          </td>
                          <td>
                            {r.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.imageUrl} alt={r.title} className={styles.recordImage} />
                            ) : (
                              <span className={styles.productDescription}>No image</span>
                            )}
                          </td>
                          <td className={styles.dateCell}>{formatDate(r.createdAt)}</td>
                          <td className={styles.actionsCell}>
                            <button
                              type="button"
                              className={styles.viewButton}
                              onClick={() => setViewing(r)}
                              aria-label={`View ${r.title}`}
                            >
                              <Eye />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                 )}
            </div>
            </section>
        </main>

        <AddRecordPopup
            isOpen={showAdd}
            onClose={() => setShowAdd(false)}
            onRecordAdded={handleRecordAdded}
        />

        <ViewRecordPopup
            isOpen={!!viewing}
            record={viewing}
            onClose={() => setViewing(null)}
        />

        {/* Add this block to render the LogoutConfirmation dialog */}
        {showLogoutConfirmation && (
          <LogoutConfirmation
            isOpen={showLogoutConfirmation}
            onConfirm={handleConfirmLogout}
            onCancel={handleCancelLogout}
          />
        )}
        </div>
    );
}