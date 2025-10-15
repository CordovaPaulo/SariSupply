import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import { verifyToken } from '@/lib/jwt';
import cloudinary from '@/utils/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || null;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const user = verifyToken(token, 'user');
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized - Invalid token'
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);
    const status = formData.get('status') as string;
    const image = formData.get('image') as File | null;

    if (!name || !description || isNaN(quantity) || isNaN(price) || !status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: name, description, price, and status are required'
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: 'Name must be at most 100 characters long'
        },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Description must be at most 1000 characters long'
        },
        { status: 400 }
      );
    }

    let productImageUrl = '';
    if (image) {
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      productImageUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result?.secure_url || '');
          }
        );
        uploadStream.end(buffer);
      });
    }

    const { db } = await connectDB();

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection failed'
        },
        { status: 500 }
      );
    }

    // Check for existing product with the exact same name
    const existingByName = await db.collection('products').findOne({ name });
    const existingByDescription = await db.collection('products').findOne({ description });
    if (existingByName && existingByDescription) {
      return NextResponse.json(
        {
          success: false,
          message: 'The exact same product already exists'
        },
        { status: 409 }
      );
    }
    
    const productData = {
      name,
      description,
      category,
      quantity,
      price,
      status,
      productImageUrl,
      owner: user.id,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('products').insertOne(productData);

    if (!result.acknowledged) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to add product'
        },
        { status: 500 }
      );
    }

    // log recent activity (add_product)
    try {
      const actor = user?.name || user?.email || 'unknown';
      await db.collection('recent_activities').insertOne({
        action: 'Add Product',
        username: actor,
        createdAt: new Date()
      });
    } catch (err) {
      console.error('Failed to log recent activity (add_product):', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Product added successfully',
      product: {
        id: result.insertedId.toString(),
        ...productData,
        _id: undefined
      }
    });

  } catch (error) {
    console.error('Add product error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}