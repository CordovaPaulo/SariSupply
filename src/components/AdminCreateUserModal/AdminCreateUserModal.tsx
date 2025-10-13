'use client';

import { useState } from 'react';
import styles from './AdminCreateUserModal.module.css';
import { toast } from 'react-toastify';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function AdminCreateUserModal({ open, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkError, setBulkError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, username }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to create user');
      }
      toast.success('User created');
      setEmail('');
      setUsername('');
      onClose();
      onCreated?.();
    } catch (e: any) {
      const msg = e?.message || 'Failed to create user';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    try {
      setBulkLoading(true);
      setBulkError('');

      const formData = new FormData();
      formData.append('file', file, file.name);

      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Bulk create failed');

      const sum = json?.summary || {};
      const created = sum.created ?? 0;
      const skipped = sum.skipped ?? 0;
      const errors = sum.errors ?? 0;

      toast.success(
        `Bulk created: ${created}${skipped ? `, skipped: ${skipped}` : ''}${errors ? `, errors: ${errors}` : ''}`
      );
      onClose();
      onCreated?.();
    } catch (e: any) {
      const msg = e?.message || 'Bulk create failed';
      setBulkError(msg);
      toast.error(msg);
    } finally {
      setBulkLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Create User</h3>
          <button className={styles.iconButton} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={loading || bulkLoading}>
              Cancel
            </button>
            <button type="submit" className={styles.primary} disabled={loading || bulkLoading}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        <div className={styles.divider}>
          <span>Or</span>
        </div>

        <div className={styles.uploader}>
          <label className={styles.uploaderLabel}>Upload JSON for batch creation</label>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleBulkUpload(f);
              e.currentTarget.value = '';
            }}
            disabled={loading || bulkLoading}
          />
          <div className={styles.hint}>
            JSON format: [{`{ "email": "a@b.com", "username": "alice" }`}, {`{ "email": "c@d.com", "username": "carl" }`}]
          </div>
          {bulkError && <div className={styles.error}>{bulkError}</div>}
        </div>
      </div>
    </div>
  );
}