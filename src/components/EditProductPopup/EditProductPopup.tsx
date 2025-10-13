'use client'

import { useState, useEffect } from 'react';
import { CreateProductRequest, ProductStatus, ProductCategory, ProductResponse } from '../../models/product';
import styles from './EditProductPopup.module.css';
import { toast } from 'react-toastify';

interface EditProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void; // Fixed callback name
  product: ProductResponse | null; // Added product prop
}

export default function EditProductPopup({ isOpen, onClose, onProductUpdated, product }: EditProductPopupProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    quantity: product?.quantity.toString() || '',
    price: product?.price.toString() || '',
    category: product?.category || ProductCategory.OTHER,
    status: product?.status || ProductStatus.IN_STOCK
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        description: product.description,
        quantity: product.quantity.toString(),
        price: product.price.toString(),
        category: product.category,
        status: product.status
      });
      setError(''); // Clear any previous errors
    }
  }, [product, isOpen]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) {
      setError('No product selected');
      toast.error('No product selected');
      return;
    }

    setLoading(true);
    setError('');

    if (!formData.name || !formData.description || !formData.quantity || !formData.price) {
      setError('All fields are required.');
      toast.error('All fields are required.');
      setLoading(false);
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('Invalid price.');
      toast.error('Invalid price.');
      setLoading(false);
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      setError('Invalid quantity.');
      toast.error('Invalid quantity.');
      setLoading(false);
      return;
    }

    try {
      // const token = localStorage.getItem('token');
      
      // if (!token) {
      //   setError('Authentication token not found');
      //   setLoading(false);
      //   return;
      // }

      // Prepare product data for update
      const productData: CreateProductRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        quantity: quantity,
        price: price,
        status: formData.status
      };

      console.log('Updating product:', productData); // Debug log
      console.log('Product ID:', product._id); // Debug log

      // Use product._id since your products use _id instead of id
      const productId = product._id || (product as any).id;
      const response = await fetch(`/api/main/edit/${productId}`, {
        method: 'PUT',
        headers:
         {
          'Content-Type': 'application/json',
          
        },
        credentials: 'include',
        body: JSON.stringify(productData)
      });

      console.log('Response status:', response.status); // Debug log

      if (response.ok) {
        const result = await response.json();
        console.log('Update result:', result); // Debug log
        
        // Call the callback to refresh the product list
        onProductUpdated();
        toast.success('Product updated successfully!');
        handleClose();
      } else {
        const errorData = await response.json();
        console.error('Update error:', errorData);
        setError(errorData.error || errorData.message || 'Failed to update product');
        toast.error(errorData.error || errorData.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: '',
      price: '',
      category: ProductCategory.OTHER,
      status: ProductStatus.IN_STOCK
    });
    setError('');
  };

  // Handle close button
  const handleClose = () => {
    resetForm();
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

  if (!isOpen || !product) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>Edit Product: {product.name}</h2>
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
                min="0.01"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className={styles.inputRow}>
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
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value={ProductStatus.IN_STOCK}>In Stock</option>
                <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
                {/* <option value={ProductStatus.DISCONTINUED}>Discontinued</option> */}
              </select>
            </div>
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
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

