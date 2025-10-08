export interface Product {
  owner: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export enum ProductCategory {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  CLEANING = 'cleaning',
  PERSONAL_CARE = 'personal_care',
  SCHOOL_SUPPLIES = 'school_supplies',
  OTHER = 'other'
}

export interface CreateProductRequest {
  owner?: string;
  name: string;
  description: string;
  category: ProductCategory;
  quantity: number;
  price: number;
  status: ProductStatus;
}

export interface UpdateProductRequest {
  owner?: string;
  name?: string;
  description?: string;
  price?: number;
  status?: ProductStatus;
}

export interface ArchiveProductRequest {
  owner: string;
  id: string;
}

export interface ProductResponse {
  _id: string;
  owner: string;
  id?: string;
  name: string;
  description: string;
  quantity: number;
  category: ProductCategory;
  price: number;
  status: ProductStatus;
  createdAt: Date;
}

export interface CheckoutProductRequest {
  _id: string;
  quantity: number;
}