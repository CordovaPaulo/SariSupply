import { NextRequest, NextResponse } from 'next/server';
import { LoginRequest } from '../../../../models/user';
import { connectDB } from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Connect to MongoDB
    const { db } = await connectDB();

    // Check if db is available
    if (!db) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection failed' 
        },
        { status: 500 }
      );
    }

    // Search for user by email OR username
    const user = await db.collection('users').findOne({
      $or: [
        { email: email },
        { username: email } // Using email field to accept username too
      ]
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User not found' 
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid credentials' 
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(
      { 
        id: user._id.toString(),
        email: user.email,
        name: user.username,
        role: user.role
      },
    );

    return NextResponse.json({
      success: true,
      token: token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}