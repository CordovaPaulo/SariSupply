'use client'

import { useState } from 'react';
import { toast } from 'react-toastify';

import styles from './ArchiveProductPopup.module.css';

interface ArchiveProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string } | null;
  onProductArchived: () => void;
} 

export default function ArchiveProductPopup({ isOpen, onClose, product, onProductArchived }: ArchiveProductPopupProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleArchive = async () => {
        if (!product) {
            setError('No product selected');
            toast.error('No product selected');
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('Authentication token not found');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/main/archive/${product.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to archive product');
                toast.error(errorData.error || 'Failed to archive product');
                return;
            }

            const result = await response.json();
            console.log('Archive result:', result); // Debug log

            onProductArchived();
            toast.success('Product archived successfully!');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to archive product. Please try again.');
            toast.error(err instanceof Error ? err.message : 'Failed to archive product. Please try again.');
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
                    <h2>Archive Product</h2>
                </div>
                
                <div className={styles.content}>
                    <p>Are you sure you want to archive <strong>"{product?.name}"</strong>?</p>
                    <p className={styles.subtitle}>This action will move the product to the archive. You can restore it later if needed.</p>
                    
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
                        className={styles.archiveButton} 
                        onClick={handleArchive}
                        disabled={loading || !product}
                    >
                        {loading ? 'Archiving...' : 'Archive Product'}
                    </button>
                </div>
            </div>
        </div>
    );
}
