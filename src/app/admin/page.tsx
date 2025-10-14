'use client'

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import ThemeToggle from '@/components/theme/ThemeToggle';
import PageLoader from '@/components/PageLoader/PageLoader';
import AdminCreateUserModal from '@/components/AdminCreateUserModal/AdminCreateUserModal';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import LogoutConfirmation from '@/components/logoutConfirmation/logout';

type UserRow = {
  _id?: string;
  id?: string;
  email: string;
  username: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

type Activity = Record<string, any> & { _id?: string; createdAt?: string };

const PAGE_SIZE = 7;
const USER_PAGE_SIZE = 15;

export default function AdminCombinedPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);
  const router = useRouter();

  // Initial load (full page loader)
  useEffect(() => {
    (async () => {
      setLoading(true);
      await checkAuthentication();
      await loadAll('');
      setLoading(false);
    })();
  }, []);

  // Debounced search effect (table loader only)
  useEffect(() => {
    if (loading) return; // skip if initial load
    setTableLoading(true);
    const timeout = setTimeout(async () => {
      if (!checkAuthentication()) { // redirect if unauthenticated
        setTableLoading(false);
        return;
      }
      await loadAll(q, true);
      setTableLoading(false);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [q]);

 const checkAuthentication = async () => {
    // No client-side token read. Cookie will be sent automatically.
    try {
      const response = await fetch('/api/auth/admin/me', {
        credentials: 'include', // send authToken cookie
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('API Response:', responseData);
        
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
  

  // Modified loadAll to support table-only loading
  const loadAll = async (query = '', isSearch = false) => {
    try {
      if (!isSearch) setError('');

      const usersUrl = `/api/admin/users?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`;
      const [actRes, usersRes] = await Promise.all([
        fetch('/api/admin/activities', { credentials: 'include' }),
        fetch(usersUrl, { credentials: 'include' }),
      ]);

      const actJson = await actRes.json().catch(() => ({}));
      const usersJson = await usersRes.json().catch(() => ({}));

      if (actRes.ok && actJson?.success) {
        const acts = Array.isArray(actJson.data) ? actJson.data : [];
        setActivities(acts);
      } else {
        setActivities([]);
      }

      if (usersRes.ok && usersJson?.success) {
        const us = Array.isArray(usersJson.data) ? usersJson.data : [];
        setUsers(us);
        setTotal(usersJson.total || us.length || 0);
      } else {
        throw new Error(usersJson?.message || 'Failed to load users');
      }

      setUsersPage(0);
      setActivitiesPage(0);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load admin data';
      setError(msg);
      toast.error(msg);
    }
  };

  const displayedUsers = useMemo(
    () => users.slice(usersPage * USER_PAGE_SIZE, usersPage * USER_PAGE_SIZE + USER_PAGE_SIZE),
    [users, usersPage]
  );

  const displayedActivities = useMemo(
    () => activities.slice(activitiesPage * PAGE_SIZE, activitiesPage * PAGE_SIZE + PAGE_SIZE),
    [activities, activitiesPage]
  );

  const usersTotalPages = Math.max(1, Math.ceil(users.length / USER_PAGE_SIZE));
  const activitiesTotalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));

  if (loading) return <PageLoader />;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.logo}>Admin</h1>
          <span>Dashboard & Users</span>
        </div>

        <div className={styles.headerRight}>
          <ThemeToggle />
          <button className={styles.addButton} onClick={() => setShowCreate(true)}>Create User</button>
          <button className={styles.logoutButton} onClick={() => setShowLogoutConfirm(true)}>Logout</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentGrid}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Overview</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.statsGrid}>
                  <div className={`${styles.statCard} ${styles.totalUsersCard} ${styles.statCardUsers}`}>
                    <div className={styles.statTitle}>Users</div>
                    <div className={styles.statValue}>{total}</div>
                  </div>

                  <div className={`${styles.statCard} ${styles.recentActivitiesCard} ${styles.statCardActivities}`}>
                    <div className={styles.statTitle}>Recent Activities</div>
                    <div className={styles.statValue}>{activities.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.card} ${styles.recentSection}`}>
               <div className={styles.cardHeader}>
                 <h3>Recent Activities</h3>
               </div>
               <div className={styles.cardBody}>
                 <div className={styles.list}>
                   {displayedActivities.length === 0 && <div>No recent activities</div>}
                   {displayedActivities.map((a, i) => (
                     <div key={a._id || i} className={styles.row}>
                       <div style={{ fontWeight: 600 }}>{a.type || a.username || a.email || 'Activity'}</div>
                       <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(a.createdAt || Date.now()).toLocaleString()}</div>
                     </div>
                   ))}
                 </div>

                 <div className={styles.cardFooter}>
                   <div className={styles.pagingInfo}>
                     Showing {activitiesPage * PAGE_SIZE + 1} - {Math.min((activitiesPage + 1) * PAGE_SIZE, activities.length)} of {activities.length}
                   </div>
                   <div className={styles.pagingButtons}>
                     <button
                       onClick={() => setActivitiesPage((p) => Math.max(0, p - 1))}
                       disabled={activitiesPage === 0}
                     >
                       Prev
                     </button>
                     <button
                       onClick={() => setActivitiesPage((p) => Math.min(activitiesTotalPages - 1, p + 1))}
                       disabled={activitiesPage >= activitiesTotalPages - 1}
                     >
                       Next
                     </button>
                   </div>
                 </div>
               </div>
             </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h3>Users</h3>
                  <div className={styles.headerActions}>
                    <div className={styles.actions}>
                      <input
                        className={styles.searchInput}
                        placeholder="Search email or username..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                {error && <div className={styles.errorText}>{error}</div>}

                <div style={{ marginBottom: 8, opacity: 0.8 }}>{total} total</div>

                <div className={styles.tableWrapper}>
                  {tableLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <span className={styles.tableLoader}>Loading...</span>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedUsers.map((u) => (
                          <tr key={(u as any).id || u._id}>
                            <td>{u.email}</td>
                            <td>{u.username}</td>
                            <td><span className={styles.badge}>{u.role}</span></td>
                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.pagingInfo}>
                    Showing {usersPage * USER_PAGE_SIZE + 1} - {Math.min((usersPage + 1) * USER_PAGE_SIZE, users.length)} of {users.length}
                    {/* {q && <span style={{ marginLeft: 8, fontStyle: 'italic', opacity: 0.7 }}>(filtered from {total} total)</span>} */}
                  </div>
                  <div className={styles.pagingButtons}>
                    <button
                      onClick={() => setUsersPage((p) => Math.max(0, p - 1))}
                      disabled={usersPage === 0}
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setUsersPage((p) => Math.min(usersTotalPages - 1, p + 1))}
                      disabled={usersPage >= usersTotalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AdminCreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadAll(q)}
      />
      <LogoutConfirmation
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          localStorage.removeItem('token');
          setShowLogoutConfirm(false);
          router.replace('/');
        }}
      />
    </div>
  );
}