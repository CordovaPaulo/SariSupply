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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as File | null;

    if (!title || !description || !image) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    let receiptImageUrl = '';
        if (image) {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
    
          receiptImageUrl = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'records' },
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

        const recordData = {
            owner: user.id,
            title,
            description,
            imageUrl: receiptImageUrl,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        const result = await db.collection('records').insertOne(recordData); // was 'products'

        if (!result.acknowledged) {
          return NextResponse.json(
            { success: false, message: 'Failed to add record' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Record added successfully',
          record: { id: result.insertedId.toString(), ...recordData, _id: undefined }
        });
  } catch (error) {
    console.error('Error in /api/main/record/upload:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}