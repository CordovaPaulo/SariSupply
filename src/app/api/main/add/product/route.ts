import { NextRequest, NextResponse } from 'next/server';
import { CreateProductRequest } from '../../../../../models/product';
import { connectDB } from '../../../../../lib/mongodb';
import { verifyToken } from '@/lib/jwt';

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

    const body: CreateProductRequest = await request.json();
    const { name, description, quantity, price, status, category } = body;

    if (!name || !description || !price || !status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: name, description, price, and status are required'
        },
        { status: 400 }
      );
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
      ...body,
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