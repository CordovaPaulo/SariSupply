import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const user: any = verifyToken(token);
    const rawId = user?.id || user?._id;
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const userId = new mongoose.Types.ObjectId(rawId);

    const { db } = await connectDB();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection rejected' }, { status: 500 });
    }

    const docs = await db
      .collection('history')
      .find({ userId }, { projection: { email: 1, username: 1, role: 1, items: 1, totals: 1, payment: 1, createdAt: 1, type: 1 } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ success: true, data: docs }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: 'Internal Error', error: String(e) }, { status: 500 });
  }
}