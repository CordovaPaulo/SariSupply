import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest, context: { params: Promise<{}> }) {
  // required role for this admin route
  const requiredRole = 'admin';

  try {
    await connectDB();

    // read token from cookie or Authorization header
    let token = request.cookies.get('authToken')?.value || request.headers.get('authorization') || null;
    if (token?.startsWith('Bearer ')) token = token.slice(7);

    if (!token) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const user = verifyToken(token, requiredRole);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'OK' }, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/auth/admin/me error', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

