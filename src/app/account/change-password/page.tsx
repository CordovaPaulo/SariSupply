'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ChangePasswordPage() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const returnTo = search.get('returnTo') || '/';

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
        setMsg(data.message || 'Failed to change password');
      } else {
        router.replace(returnTo);
      }
    } catch (err: any) {
      setMsg(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1>Change your password</h1>
      <p>You must change your password before continuing.</p>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{ width: '100%', marginBottom: 8 }} />
        <label>Current password</label>
        <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" required style={{ width: '100%', marginBottom: 8 }} />
        <label>New password</label>
        <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required minLength={8} style={{ width: '100%', marginBottom: 12 }} />
        <button disabled={loading} type="submit">{loading ? 'Saving…' : 'Change password'}</button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}