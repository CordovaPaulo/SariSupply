import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { ProductStatus, ProductCategory, CreateProductRequest } from '../../../../../models/product';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/mongodb/Product';
import RecentAct from '@/models/mongodb/recentAct';
import mongoose from 'mongoose';
import cloudinary from '@/utils/cloudinary';

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

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    // normalize category value from formData (may be null or non-string)
    const categoryRaw = formData.get('category');
    const category = typeof categoryRaw === 'string' ? categoryRaw : String(categoryRaw ?? '');
    const quantity = parseInt(String(formData.get('quantity')));
    const price = parseFloat(String(formData.get('price')));
    // const status = formData.get('status') as string;
    const image = formData.get('image') as File | null;

    // Validate required fields
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

    if (!Object.values(ProductCategory).includes(category as ProductCategory)) {
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

    // Check if the product exists
    const existingProduct = await Product.findOne({
      _id: productId,
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // Handle image upload (same approach as add route)
    let uploadedImageUrl: string | undefined = undefined;

    if (image && image.size > 0) {
      try {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        uploadedImageUrl = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'products' },
            (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result?.secure_url || '');
            }
          );
          uploadStream.end(buffer);
        });
      } catch (err) {
        console.error('Cloudinary multipart upload failed:', err);
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
      }
    }
    // } else if (typeof imageBase64 === 'string' && imageBase64.trim() !== '') {
    //   try {
    //     const uploadResult = await cloudinary.uploader.upload(imageBase64, { folder: 'products' });
    //     uploadedImageUrl = uploadResult.secure_url;
    //   } catch (err) {
    //     console.error('Cloudinary base64 upload failed:', err);
    //     return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
    //   }
    // }

    // Prepare update payload; only set productImageUrl when a new image was uploaded
    const updatePayload: any = {
      name: name.trim(),
      description: description.trim(),
      category,
      quantity,
      price,
      // status: finalStatus,
      owner: userId,
      ownerId: userId,
      updatedAt: new Date()
    };
    if (uploadedImageUrl) updatePayload.productImageUrl = uploadedImageUrl;

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatePayload,
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    try {
      const actor = decoded?.name || decoded?.email || 'unknown';
      await RecentAct.create({ action: 'Edit Product', username: actor });
    } catch (e) {
      console.error('Failed to log recent activity (edit_product):', e);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updatedProduct._id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        productImageUrl: updatedProduct.productImageUrl,
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