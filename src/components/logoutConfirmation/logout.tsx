import React from "react";
import { toast } from "react-toastify";
import styles from "./logout.module.css";

interface LogoutConfirmationProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutConfirmation: React.FC<LogoutConfirmationProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      localStorage.removeItem('token');
      toast.success('Logged out successfully!');
      onConfirm();
    } catch (error) {
      toast.error('Logout failed!');
      onCancel();
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div className={styles.popup}>
        <h2 id="logout-title">Confirm Logout</h2>
        <p>Are you sure you want to logout?</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmation;