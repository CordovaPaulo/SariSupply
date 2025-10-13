'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './addRecordPopup.module.css';

interface AddRecordPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordAdded?: () => void;
}

export default function AddRecordPopup({ isOpen, onClose, onRecordAdded }: AddRecordPopupProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        image: e.target.files![0],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        image: null,
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: null,
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.title || !formData.description || !formData.image) {
      setError('All fields are required.');
      toast.error('All fields are required.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Unauthorized. Please log in again.');
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('image', formData.image);

      const response = await fetch('/api/main/record/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: form,
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.message || 'Failed to add record');
        toast.error(result.message || 'Failed to add record');
        return;
      }

      resetForm();
      if (onRecordAdded) onRecordAdded();
      toast.success('Record added successfully!');
      handleClose();
    } catch (error) {
      setError('Failed to add record');
      toast.error('Failed to add record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>Add New Record</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter record title"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter record description"
              rows={3}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="image">Receipt Image *</label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              required
              className={styles.input}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Adding...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}