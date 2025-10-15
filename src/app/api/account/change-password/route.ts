import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { generateToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { db } = await connectDB();
    if (!db) return NextResponse.json({ success: false, message: 'DB connection failed' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').toString().toLowerCase().trim();
    const currentPassword = (body.currentPassword || '').toString();
    const newPassword = (body.newPassword || '').toString();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Email, currentPassword, and newPassword are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, message: 'New password must be at least 8 characters' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ success: false, message: 'New password must be different from current password' }, { status: 400 });
    }
    if (newPassword.toLowerCase().includes(email.split('@')[0])) {
      return NextResponse.json({ success: false, message: 'New password is too similar to email' }, { status: 400 });
    }
    if (!newPassword.includes('') || !/\d/.test(newPassword)) {
      return NextResponse.json({ success: false, message: 'New password must include letters and numbers' }, { status: 400 });
    }
    if (!/[!@#$%^&*(),.?":{}|<>\\[\]\/`~;'+=_-]/.test(newPassword)) {
      return NextResponse.json({ success: false, message: 'New password must include at least one special character' }, { status: 400 });
    }
    if (/\s/.test(newPassword)) {
      return NextResponse.json({ success: false, message: 'New password must not contain spaces' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ email });
    if (!user) return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 12);
    const now = new Date();
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { password: hashed, mustChangePassword: false, updatedAt: now } }
    );

    // Re-issue token with mustChangePassword: false
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.username,
      role: user.role,
      mustChangePassword: false,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (e) {
    console.error('POST /api/account/change-password error:', e);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}