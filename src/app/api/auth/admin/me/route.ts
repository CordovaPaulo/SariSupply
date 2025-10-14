import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../../lib/jwt";
import { connectDB } from "../../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    // Read token from cookie instead of Authorization header
    const token = request.cookies.get('authToken')?.value || null;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No authentication token provided. Please login.' },
        { status: 401 }
      );
    }

    // Verify and decode the JWT token
    const payload = verifyToken(token, 'admin');
    
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
    }

    // Connect to database
    const { db } = await connectDB();
    
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Find user in database using the ID from token
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(payload.id) },
      { 
        projection: { 
          password: 0 // Exclude password from response
        } 
      }
    );

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User not found. Account may have been deleted.' 
        },
        { status: 404 }
      );
    }

    // Return user data
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tokenData: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000)
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle specific JWT errors
    if (error instanceof Error) {
      if (error.message.includes('jwt expired')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Token has expired. Please login again.' 
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes('jwt malformed')) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Invalid token format. Please login again.' 
          },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during authentication' 
      },
      { status: 500 }
    );
  }
}

