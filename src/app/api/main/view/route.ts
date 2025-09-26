import { NextRequest, NextResponse } from 'next/server';
import { CreateProductRequest } from '@/models/product';
import { connectDB } from '@/lib/mongodb';
import { verifyToken } from '@/lib/jwt';
import { request } from 'http';

export async function GET(request: NextRequest) {
    try{
        const token = request.headers.get('authorization')?.split(' ')[1];
        if(!token){
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unauthorized'
                },
                {status: 401}
            );
        }
        const user = verifyToken(token);
        if(!user){
            return NextResponse.json(
                {
                    success: false,
                    message: 'Unauthorized - Invalid token'
                },
                {status: 401}
            );
        }
        const { db } = await connectDB();
        if(!db){
            return NextResponse.json(
                {
                    success: false,
                    message: 'Database connection failed'
                },
                {status: 500}
            );
        }
        const products = await db.collection('products').find({owner: user.id}).toArray();
        return NextResponse.json(
            {
                success: true,
                data: products
            },
            {status: 200}
        );
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Internal Server Error'
            },
            {status: 500}
        );
    }
}