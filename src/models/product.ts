export interface Product {
  owner: string;
  id: string;
  name: string;
  description: string;
  price: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductStatus {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export interface CreateProductRequest {
  owner: string;
  name: string;
  description: string;
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
  owner: string;
  id: string;
  name: string;
  description: string;
  price: number;
  status: ProductStatus;
}