'use client';

import styles from './viewRecordPopup.module.css';

type RecordItem = {
  _id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt?: string | Date;
};

interface ViewRecordPopupProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecordItem | null;
}

export default function ViewRecordPopup({ isOpen, onClose, record }: ViewRecordPopupProps) {
  if (!isOpen || !record) return null;

  const formatDate = (date?: string | Date) =>
    date
      ? new Date(date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-record-title"
      >
        <div className={styles.header}>
          <h2 id="view-record-title">Record Details</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {record.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.previewImage}
              src={record.imageUrl}
              alt={record.title}
            />
          ) : (
            <div className={styles.noImage}>No image uploaded</div>
          )}

          <div className={styles.detailSection}>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Title</div>
              <div className={styles.detailValue}>{record.title}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Description</div>
              <div className={styles.detailValue}>{record.description}</div>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Date</div>
              <div className={styles.detailValue}>{formatDate(record.createdAt)}</div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          {record.imageUrl && (
            <a
              href={record.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openImageButton}
              aria-label="Open image in new tab"
            >
              Open Image
            </a>
          )}
          <button type="button" className={styles.closeActionButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}