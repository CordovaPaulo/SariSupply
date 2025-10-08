import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

type CheckoutItem = {
  productId: string;
  quantity: number;
  // Optional client-provided fields (ignored for authoritative data)
  name?: string;
  price?: number;
};

type CheckoutRequest = {
  items: CheckoutItem[];
  amountPaid?: number; // added
};

const toInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

async function handleCheckout(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user: any = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Invalid Token' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CheckoutRequest;
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const amountPaidInput = Number((body as any)?.amountPaid);
    const amountPaid = Number.isFinite(amountPaidInput) ? Math.max(0, amountPaidInput) : NaN;

    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No items to checkout' },
        { status: 400 }
      );
    }

    // Normalize and validate items
    const items = rawItems
      .map((i) => ({
        productId: String(i.productId || '').trim(),
        quantity: toInt(i.quantity),
      }))
      .filter((i) => i.productId && i.quantity > 0);

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid items payload' },
        { status: 400 }
      );
    }

    // Ensure DB connection
    const { db } = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Database connection rejected' },
        { status: 500 }
      );
    }

    const session = await mongoose.startSession();

    try {
      let resultSummary: any = null;

      await session.withTransaction(async () => {
        const ids = items.map((i) => {
          if (!mongoose.Types.ObjectId.isValid(i.productId)) {
            throw new Error(`Invalid productId: ${i.productId}`);
          }
          return new mongoose.Types.ObjectId(i.productId);
        });

        // Fetch products authoritatively
        const products = await db
          .collection('products')
          .find(
            { _id: { $in: ids } },
            {
              session,
              projection: { name: 1, price: 1, quantity: 1 },
            }
          )
          .toArray();

        const productMap = new Map<string, any>();
        for (const p of products) {
          productMap.set(String(p._id), p);
        }

        // Validate existence and stock
        for (const item of items) {
          const p = productMap.get(item.productId);
          if (!p) {
            throw new Error(`Product not found: ${item.productId}`);
          }
          const stock = toInt(p.quantity);
          if (item.quantity > stock) {
            throw new Error(
              `Insufficient stock for ${p.name ?? item.productId}: requested ${item.quantity}, available ${stock}`
            );
          }
        }

        // Perform atomic decrements with guards
        const ops = items.map((item) => ({
          updateOne: {
            filter: {
              _id: new mongoose.Types.ObjectId(item.productId),
              quantity: { $gte: item.quantity },
            },
            update: {
              $inc: {
                quantity: -item.quantity,
                sold: item.quantity,
              },
            },
          },
        }));

        const bulkRes = await db
          .collection('products')
          .bulkWrite(ops as any, { ordered: true, session });

        const modified = bulkRes.modifiedCount ?? 0;
        if (modified !== items.length) {
          throw new Error('Stock update conflict. Please retry.');
        }

        // Build history doc
        const lines = items.map((i) => {
          const p = productMap.get(i.productId) || {};
          const unitPrice = Number(p.price ?? 0);
          const name = String(p.name ?? '');
          const qty = toInt(i.quantity);
          return {
            productId: new mongoose.Types.ObjectId(i.productId),
            name,
            unitPrice,
            quantity: qty,
            subtotal: unitPrice * qty,
          };
        });

        const totalQuantity = lines.reduce((s, l) => s + toInt(l.quantity), 0);
        const totalAmount = lines.reduce((s, l) => s + Number(l.subtotal || 0), 0);

        // Validate amountPaid
        if (!Number.isFinite(amountPaid) || amountPaid < totalAmount) {
          throw new Error(
            `Amount paid is insufficient. Total is ${totalAmount.toFixed(2)}, paid ${Number(amountPaid).toFixed(2)}`
          );
        }
        const change = amountPaid - totalAmount;

        const userId =
          (user.id && mongoose.Types.ObjectId.isValid(user.id) && new mongoose.Types.ObjectId(user.id)) ||
          (user._id && mongoose.Types.ObjectId.isValid(user._id) && new mongoose.Types.ObjectId(user._id)) ||
          null;

        const historyDoc = {
          userId,
          email: user.email ?? null,
          username: user.username ?? null,
          role: user.role ?? null,
          items: lines,
          totals: {
            quantity: totalQuantity,
            amount: totalAmount,
          },
          payment: {
            amountPaid,
            change,
            currency: 'PHP',
          },
          createdAt: new Date(),
          type: 'checkout',
        };

        const insertRes = await db.collection('history').insertOne(historyDoc, { session });

        resultSummary = {
          transactionId: String(insertRes.insertedId),
          totals: historyDoc.totals,
          items: lines,
          payment: historyDoc.payment,
          createdAt: historyDoc.createdAt,
        };
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Checkout successful',
          data: resultSummary,
        },
        { status: 200 }
      );
    } catch (err: any) {
      const message = err?.message || 'Checkout failed';
      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 400 }
      );
    } finally {
      session.endSession();
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal Error', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // UI calls POST /api/main/checkout
  return handleCheckout(request);
}

export async function PATCH(request: NextRequest) {
  // Also support PATCH, per request
  return handleCheckout(request);
}