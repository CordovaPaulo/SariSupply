'use client'

import { useState } from 'react';
import { CreateProductRequest, ProductStatus, ProductCategory } from '../../models/product';
import styles from './AddProductPopup.module.css';

interface AddProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

export default function AddProductPopup({ isOpen, onClose, onProductAdded }: AddProductPopupProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    price: '',
    category: ProductCategory.OTHER,
    status: ProductStatus.IN_STOCK,
    productImageUrl: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image file change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.description || !formData.quantity || !formData.price) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      setLoading(false);
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      setError('Please enter a valid quantity');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('name', formData.name);
      form.append('description', formData.description);
      form.append('category', formData.category);
      form.append('quantity', quantity.toString());
      form.append('price', price.toString());
      form.append('status', quantity > 0 ? ProductStatus.IN_STOCK : ProductStatus.OUT_OF_STOCK);
      if (imageFile) {
        form.append('image', imageFile);
      }

      const response = await fetch('/api/main/add/product', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (response.ok) {
        resetForm();
        onProductAdded();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add product');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: '',
      price: '',
      category: ProductCategory.OTHER,
      status: ProductStatus.IN_STOCK,
      productImageUrl: ''
    });
    setImageFile(null);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const formatCategoryName = (category: ProductCategory): string => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>Add New Product</h2>
          <button 
            onClick={handleClose}
            className={styles.closeButton}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Product Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              rows={3}
              required
            />
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="quantity">Quantity *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="price">Price (₱) *</label>
              <input
                type="number"
                id="price"
                name="price"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value={ProductCategory.FOOD}>
                {formatCategoryName(ProductCategory.FOOD)}
              </option>
              <option value={ProductCategory.BEVERAGE}>
                {formatCategoryName(ProductCategory.BEVERAGE)}
              </option>
              <option value={ProductCategory.CLEANING}>
                {formatCategoryName(ProductCategory.CLEANING)}
              </option>
              <option value={ProductCategory.PERSONAL_CARE}>
                {formatCategoryName(ProductCategory.PERSONAL_CARE)}
              </option>
              <option value={ProductCategory.SCHOOL_SUPPLIES}>
                {formatCategoryName(ProductCategory.SCHOOL_SUPPLIES)}
              </option>
              <option value={ProductCategory.OTHER}>
                {formatCategoryName(ProductCategory.OTHER)}
              </option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="image">Product Image (optional)</label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
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
            <button 
              type="submit" 
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

