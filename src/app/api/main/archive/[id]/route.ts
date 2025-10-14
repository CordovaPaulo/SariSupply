import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { ProductStatus } from '../../../../../models/product';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/mongodb/Product';
import RecentAct from '@/models/mongodb/recentAct';
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

    // Check if the product exists and belongs to the user
    const existingProduct = await Product.findOne({
      _id: productId,
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is already discontinued (archived)
    if (existingProduct.status === ProductStatus.DISCONTINUED) {
      return NextResponse.json(
        { error: 'Product is already archived' },
        { status: 400 }
      );
    }

    // Archive the product by setting status to DISCONTINUED
    const archivedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        status: ProductStatus.DISCONTINUED,
        owner: userId,
        ownerId: userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!archivedProduct) {
      return NextResponse.json(
        { error: 'Failed to archive product' },
        { status: 500 }
      );
    }

    // record recent activity (archive_product)
    try {
      const actor = decoded?.name || decoded?.email || 'unknown';
      await RecentAct.create({ action: 'Archive Product', username: actor });
    } catch (e) {
      console.error('Failed to log recent activity (archive_product):', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Product archived successfully',
      data: {
        id: archivedProduct._id,
        name: archivedProduct.name,
        status: archivedProduct.status,
        owner: archivedProduct.owner,
        archivedBy: decoded.name || decoded.email,
        archivedAt: archivedProduct.updatedAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Archive product error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}