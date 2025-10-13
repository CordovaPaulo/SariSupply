import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { ProductStatus } from '../../../../../../models/product';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/mongodb/Product';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to MongoDB
    await connectDB();

    // Await params before accessing properties (Next.js 15 requirement)
    const { id: productId } = await params;

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

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

    // Check if the product exists and belongs to the user
    const existingProduct = await Product.findOne({
      _id: productId,
      ownerId: userId
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or you do not have permission to restore it' },
        { status: 404 }
      );
    }

    // Check if product is actually archived (discontinued)
    if (existingProduct.status !== ProductStatus.DISCONTINUED) {
      return NextResponse.json(
        { error: 'Product is not archived and cannot be restored' },
        { status: 400 }
      );
    }

    // Determine new status based on quantity
    const newStatus = existingProduct.quantity > 0 ? ProductStatus.IN_STOCK : ProductStatus.OUT_OF_STOCK;

    // Restore the product
    const restoredProduct = await Product.findByIdAndUpdate(
      productId,
      {
        status: newStatus,
        owner: userId,
        ownerId: userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!restoredProduct) {
      return NextResponse.json(
        { error: 'Failed to restore product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product restored successfully',
      data: {
        id: restoredProduct._id,
        name: restoredProduct.name,
        status: restoredProduct.status,
        owner: restoredProduct.owner,
        restoredBy: decoded.name || decoded.email,
        restoredAt: restoredProduct.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Restore product error:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('Cast to ObjectId failed')) {
        return NextResponse.json(
          { error: 'Invalid product ID format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}