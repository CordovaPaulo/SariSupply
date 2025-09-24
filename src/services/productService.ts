import { Product, CreateProductRequest, UpdateProductRequest, ProductResponse } from '../models/product';

export const productService = {
  // Get all products
  async getProducts(): Promise<ProductResponse[]> {
    const response = await fetch('/api/products');
    return response.json();
  },

  // Get single product
  async getProduct(id: string): Promise<ProductResponse> {
    const response = await fetch(`/api/products/${id}`);
    return response.json();
  },

  // Create product
  async createProduct(data: CreateProductRequest): Promise<ProductResponse> {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Update product
  async updateProduct(id: string, data: UpdateProductRequest): Promise<ProductResponse> {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Archive product
  async ArchiveProduct(id: string): Promise<void> {
    await fetch(`/api/products/archive/${id}`, {
      method: 'POST'
    });
  }
};