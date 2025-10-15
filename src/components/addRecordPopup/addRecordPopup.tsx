'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
      const file = e.target.files[0];
      // revoke previous preview if any
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
    } else {
      // no file selected
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setFormData((prev) => ({
        ...prev,
        image: null,
      }));
    }
  };

  const removeImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: null,
    });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('image', formData.image);

      const response = await fetch('/api/main/record/upload', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
        credentials: 'include',
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

            {previewUrl ? (
              <div className={styles.imagePreview}>
                <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                <div className={styles.previewActions}>
                  <button
                    type="button"
                    onClick={removeImage}
                    className={styles.removeImageBtn}
                  >
                    Remove image
                  </button>
                </div>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              required={!previewUrl}
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