import { NextRequest, NextResponse } from 'next/server';
import { ForgotPasswordRequest } from '../../../../models/user';
import { connectDB } from '../../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body: ForgotPasswordRequest = await request.json();
    const { email, username } = body;

    console.log('Verifying user with:', { email, username });

    const { db } = await connectDB();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Add case-insensitive search and trim whitespace
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase().trim(), 
      username: username.trim() 
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }
    
    // Return user details for the next step
    return NextResponse.json({ 
      message: 'User verified',
      user: {
        email: user.email,
        username: user.username,
        _id: user._id
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
