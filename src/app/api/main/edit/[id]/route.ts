import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { ProductStatus, ProductCategory, CreateProductRequest } from '../../../../../models/product';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/mongodb/Product';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id: productId } = await params;

    // Read token from cookie first, fallback to Authorization header.
    // Support cookie value potentially prefixed with "Bearer ".
    let token = request.cookies.get('authToken')?.value || request.headers.get('authorization') || null;
    if (token?.startsWith('Bearer ')) token = token.slice(7);

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const decoded = verifyToken(token, 'user');

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = decoded.id;

    // Validate product ID format
    if (!productId || productId.trim() === '' || productId === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    let requestData: CreateProductRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid JSON'},
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, description, category, quantity, price } = requestData;

    if (!name || !description || category === undefined || quantity === undefined || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, category, quantity, price' },
        { status: 400 }
      );
    }

    // Validate data types and values
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Product name must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Product description must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!Object.values(ProductCategory).includes(category)) {
      return NextResponse.json(
        { error: 'Invalid product category' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative integer' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Check if the product exists and belongs to the user
    const existingProduct = await Product.findOne({
      _id: productId,
    //   ownerId: userId
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // // Auto-adjust status based on quantity if status is not explicitly discontinued
    // let finalStatus = status;
    // if (status !== ProductStatus.DISCONTINUED) {
    //   if (quantity === 0) {
    //     finalStatus = ProductStatus.OUT_OF_STOCK;
    //   } else if (quantity > 0 && status === ProductStatus.OUT_OF_STOCK) {
    //     finalStatus = ProductStatus.IN_STOCK;
    //   }
    // }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name.trim(),
        description: description.trim(),
        category,
        quantity,
        price,
        // status: finalStatus,
        owner: userId,
        ownerId: userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updatedProduct._id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        category: updatedProduct.category,
        quantity: updatedProduct.quantity,
        price: updatedProduct.price,
        // status: updatedProduct.status,
        owner: updatedProduct.owner,
        updatedBy: decoded.name || decoded.email,
        updatedAt: updatedProduct.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Edit product error:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('Cast to ObjectId failed')) {
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Product name already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}