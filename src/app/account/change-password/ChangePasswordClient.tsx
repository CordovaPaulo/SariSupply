'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
//   const search = useSearchParams();
//   const returnTo = search?.get('returnTo') || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const message = data?.message || 'Failed to change password';
        setMsg(message);
        toast.error(message);
      } else {
        toast.success('Password changed successfully');
        router.replace('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unexpected error';
      setMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.changePasswordPage}>
      <main className={styles.main}>
        <section className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1>Change your password</h1>
            <p>You must change your password before continuing.</p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.formRow}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Current password</label>
              <input
                className={styles.input}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                required
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>New password</label>
              <input
                className={styles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                required
                minLength={8}
              />
              <div className={styles.helper}>Minimum 8 characters</div>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.submitButton}
                disabled={loading}
                type="submit"
              >
                {loading ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>

          {msg && <p className={styles.errorMessage}>{msg}</p>}
        </section>
      </main>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}