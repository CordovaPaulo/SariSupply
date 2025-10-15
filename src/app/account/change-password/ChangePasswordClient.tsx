'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const router = useRouter();
//   const search = useSearchParams();
//   const returnTo = search?.get('returnTo') || '/';

  function passwordChecks(pw: string) {
    const minLength = pw.length >= 8;
    const hasLetters = /[A-Za-z]/.test(pw);
    const hasNumbers = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\\[\]\/`~;'+=_-]/.test(pw);
    const noSpaces = !/\s/.test(pw);
    return { minLength, hasLetters, hasNumbers, hasSpecial, noSpaces };
  }

  const checks = passwordChecks(newPassword);

  const togglePasswordVisibilityCurrent = () => {
    setShowPasswordCurrent((s) => !s);
  };

  const togglePasswordVisibilityNew = () => {
    setShowPasswordNew((s) => !s);
  };

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

              <div className={styles.passwordContainer}>
                <div className={styles.passwordInputWrapper}>
                  <input
                    className={styles.input}
                    type={showPasswordCurrent ? 'text' : 'password'}
                    id="current-password"
                    name="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibilityCurrent}
                    aria-label={showPasswordCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordCurrent ? (
                      <Eye className={styles.eyeIcon} />
                    ) : (
                      <EyeOff className={styles.eyeIcon} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>New password</label>

              <div className={styles.passwordContainer}>
                <div className={styles.passwordInputWrapper}>
                  <input
                    className={styles.input}
                    type={showPasswordNew ? 'text' : 'password'}
                    id="new-password"
                    name="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibilityNew}
                    aria-label={showPasswordNew ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordNew ? (
                      <Eye className={styles.eyeIcon} />
                    ) : (
                      <EyeOff className={styles.eyeIcon} />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={styles.helper}
                style={{ color: checks.minLength ? 'green' : 'red' }}
                aria-live="polite"
              >
                Minimum 8 characters
              </div>

              <div
                className={styles.helper}
                style={{
                  color:
                    checks.hasLetters && checks.hasNumbers && checks.hasSpecial
                      ? 'green'
                      : 'red',
                }}
                aria-live="polite"
              >
                Must include letters, numbers, and special characters
              </div>

              <div
                className={styles.helper}
                style={{ color: checks.noSpaces ? 'green' : 'red' }}
                aria-live="polite"
              >
                Must not contain spaces
              </div>
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