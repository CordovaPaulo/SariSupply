import { NextRequest, NextResponse } from 'next/server';
import { ResetPasswordRequest } from '../../../../models/user';
import { connectDB } from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { email, username, newPassword } = body;

    const { db } = await connectDB();

    if (!db) { 
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase().trim(), 
      username: username.trim() 
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const result = await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    console.log('Password updated successfully for user:', user.username);

    return NextResponse.json({ 
      message: 'Password reset successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}