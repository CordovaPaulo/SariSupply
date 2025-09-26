'use client'

import { useState } from 'react';
import styles from './UnarchiveProductPopup.module.css';

interface RestoreProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string } | null;
  onProductRestored: () => void;
} 

export default function UnarchiveProductPopup({ isOpen, onClose, product, onProductRestored }: RestoreProductPopupProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRestore = async () => {
        if (!product) {
            setError('No product selected');
            return;
        }
        
        console.log('Restoring product:', product); // Debug log
        
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('Authentication token not found');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/main/archive/restore/${product.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to restore product');
            }

            const result = await response.json();
            console.log('Restore result:', result); // Debug log

            onProductRestored();
            onClose();
        } catch (err) {
            console.error('Restore error:', err);
            setError(err instanceof Error ? err.message : 'Failed to restore product. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!loading) {
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.popup}>
                <div className={styles.header}>
                    <h2>Restore Product</h2>
                </div>
                
                <div className={styles.content}>
                    <p>Are you sure you want to restore <strong>"{product?.name}"</strong>?</p>
                    <p className={styles.subtitle}>This action will move the product back to your active inventory.</p>
                    
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </div>
                
                <div className={styles.actions}>
                    <button 
                        className={styles.cancelButton} 
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        className={styles.restoreButton} 
                        onClick={handleRestore}
                        disabled={loading || !product}
                    >
                        {loading ? 'Restoring...' : 'Restore Product'}
                    </button>
                </div>
            </div>
        </div>
    );
}
