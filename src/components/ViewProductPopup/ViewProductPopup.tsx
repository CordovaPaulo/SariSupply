'use client'

import { ProductResponse, ProductStatus, ProductCategory } from '../../models/product';
import styles from './ViewProductPopup.module.css';

interface ViewProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductResponse | null;
}

export default function ViewProductPopup({ isOpen, onClose, product }: ViewProductPopupProps) {

  // Handle close button
  const handleClose = () => {
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Format category display name
  const formatCategoryName = (category: ProductCategory): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format status display name
  const formatStatusName = (status: ProductStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !product) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>Product Details</h2>
          <button 
            onClick={handleClose}
            className={styles.closeButton}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.detailSection}>
            <div className={styles.detailGroup}>
              <label className={styles.detailLabel}>Product Name</label>
              <div className={styles.detailValue}>{product.name}</div>
            </div>

            <div className={styles.detailGroup}>
              <label className={styles.detailLabel}>Description</label>
              <div className={styles.detailValue}>{product.description}</div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailGroup}>
                <label className={styles.detailLabel}>Category</label>
                <div className={styles.detailValue}>
                  {formatCategoryName(product.category)}
                </div>
              </div>

              <div className={styles.detailGroup}>
                <label className={styles.detailLabel}>Status</label>
                <div className={styles.detailValue}>
                  <span className={`${styles.statusBadge} ${styles[product.status.toLowerCase()]}`}>
                    {formatStatusName(product.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.detailRow}>
              <div className={styles.detailGroup}>
                <label className={styles.detailLabel}>Quantity</label>
                <div className={styles.detailValue}>{product.quantity.toLocaleString()}</div>
              </div>

              <div className={styles.detailGroup}>
                <label className={styles.detailLabel}>Unit Price</label>
                <div className={styles.detailValue}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>

            <div className={styles.detailGroup}>
              <label className={styles.detailLabel}>Total Value</label>
              <div className={`${styles.detailValue} ${styles.totalValue}`}>
                {formatCurrency(product.price * product.quantity)}
              </div>
            </div>

          </div>
        </div>

        <div className={styles.actions}>
          <button 
            type="button" 
            onClick={handleClose}
            className={styles.closeActionButton}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

