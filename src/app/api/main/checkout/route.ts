import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { ProductStatus } from '../../../../models/product';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/mongodb/Product';
import mongoose from 'mongoose';