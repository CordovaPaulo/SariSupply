import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { sendUserCreatedEmail } from '@/lib/mailer';

// Helper: validate email
function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

// Helper: extract and check token (basic auth placeholder)
function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add real admin authorization
    const token = request.cookies.get('authToken')?.value || null;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectDB();
    if (!db) return NextResponse.json({ success: false, message: 'DB connection failed' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ];
    }

    const cursor = db
      .collection('users')
      .find(filter, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      cursor.toArray(),
      db.collection('users').countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: items, total, page, limit });
  } catch (e: any) {
    console.error('GET /api/admin/users error:', e);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add real admin authorization
    const token = request.cookies.get('authToken')?.value || null;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectDB();
    if (!db) return NextResponse.json({ success: false, message: 'DB connection failed' }, { status: 500 });

    const body = await request.json();
    const emailRaw: string = (body.email || '').toString();
    const usernameRaw: string = (body.username || '').toString();
    const email = emailRaw.toLowerCase().trim();
    const username = usernameRaw.trim();

    if (!email || !username) {
      return NextResponse.json({ success: false, message: 'Email and username are required' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ success: false, message: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const existing = await db.collection('users').findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Email or username already exists' }, { status: 409 });
    }

    const defaultPassword = email.split('@')[0];
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const now = new Date();
    const doc = { email, username, password: hashedPassword, role: 'user', createdAt: now, updatedAt: now, mustChangePassword: true };
    const result = await db.collection('users').insertOne(doc);

    if (!result.acknowledged) {
      return NextResponse.json({ success: false, message: 'Insert failed' }, { status: 500 });
    }

    // Derive base URL for login link
    const baseUrl =
      request.headers.get('origin') ||
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'}` ||
      process.env.BASE_URL ||
      'http://localhost:3000';
    const loginUrl = `${baseUrl}/`;

    let emailSent = false;
    try {
      await sendUserCreatedEmail({
        to: email,
        username,
        tempPassword: defaultPassword,
        loginUrl,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error('sendUserCreatedEmail failed:', mailErr);
    }

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), email, username, role: 'user', createdAt: now, updatedAt: now },
      defaultPassword, // Note: For admin visibility; consider sending via email instead
      emailSent,
    });
  } catch (e: any) {
    console.error('POST /api/admin/users error:', e);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
