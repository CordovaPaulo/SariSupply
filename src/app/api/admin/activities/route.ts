import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add real admin authorization
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { db } = await connectDB();
    if (!db) return NextResponse.json({ success: false, message: 'DB connection failed' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Use existing 'history' collection if present, fallback to last 20 created users
    const historyExists = await db.listCollections({ name: 'history' }, { nameOnly: true }).toArray();
    if (historyExists.length > 0) {
      const docs = await db
        .collection('history')
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return NextResponse.json({ success: true, data: docs });
    }

    const users = await db
      .collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ success: true, data: users });
  } catch (e: any) {
    console.error('GET /api/admin/activities error:', e);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
