import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import { verifyToken } from '@/lib/jwt';
import cloudinary from '@/utils/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
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