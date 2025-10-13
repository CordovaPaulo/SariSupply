import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// dotenv.config();s

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

const secKey = process.env.JWT_SECRET_KEY;
const exp = '24h';

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  if (!secKey) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(payload, secKey, { expiresIn: exp });
}

export function verifyToken(token: string, requiredRole: string): JwtPayload | null {
  try {
    if (!secKey) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    
    const decoded = jwt.verify(token, secKey) as JwtPayload;

    if (decoded.role !== requiredRole) {
      throw new Error('Unauthorized');
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); 
}

export function decodeTokenUnsafe(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('Token decoding failed:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    
    if (!decoded || !decoded.exp) {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return null;
  }
}