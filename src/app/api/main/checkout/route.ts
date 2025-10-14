import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { sendInventoryAlert } from '@/lib/mailer'; // added

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutRequest = {
  items: CheckoutItem[];
  amountPaid?: number;
};

const toInt = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

async function handleCheckout(request: NextRequest) {
  const { db } = await connectDB();

  if (!db) {
    return NextResponse.json({ success: false, message: 'Database connection rejected' }, { status: 500 });
  }

  let session: any = null;
  try {
    const token = request.cookies.get('authToken')?.value || null;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const user: any = verifyToken(token, 'user');
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized - Invalid Token' }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutRequest;
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const amountPaidInput = Number((body as any)?.amountPaid);
    const amountPaid = Number.isFinite(amountPaidInput) ? Math.max(0, amountPaidInput) : NaN;

    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, message: 'No items to checkout' }, { status: 400 });
    }

    // Normalize and validate items early (before starting session)
    const items = rawItems
      .map((i) => ({
        productId: String(i.productId || '').trim(),
        quantity: toInt(i.quantity),
      }))
      .filter((i) => i.productId && i.quantity > 0);

    if (items.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid items payload' }, { status: 400 });
    }

    // Pre-validate that productIds look like ObjectId to fail fast
    for (const it of items) {
      if (!mongoose.Types.ObjectId.isValid(it.productId)) {
        return NextResponse.json({ success: false, message: `Invalid productId: ${it.productId}` }, { status: 400 });
      }
    }

    // Prefer session from connectDB (MongoClient) if available, otherwise fall back to mongoose
    if ((db as any).client && typeof (db as any).client.startSession === 'function') {
      session = (db as any).client.startSession();
    } else {
      // fallback
      session = await mongoose.startSession();
    }
    session.startTransaction();

    try {
      const ids = items.map((i) => new mongoose.Types.ObjectId(i.productId));

      // Fetch authoritative product data inside transaction (pass session)
      const products = await db
        .collection('products')
        .find(
          { _id: { $in: ids } },
          { session, projection: { name: 1, price: 1, quantity: 1, ownerId: 1, owner: 1, sku: 1, lowStockThreshold: 1 } } // include owner fields + optional sku/threshold
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
          // abort transaction and return 400
          await session.abortTransaction();
          return NextResponse.json({ success: false, message: `Product not found: ${item.productId}` }, { status: 400 });
        }
        const stock = toInt(p.quantity);
        if (item.quantity > stock) {
          await session.abortTransaction();
          return NextResponse.json({
            success: false,
            message: `Insufficient stock for ${p.name ?? item.productId}: requested ${item.quantity}, available ${stock}`,
          }, { status: 409 });
        }
      }

      // Perform atomic decrements
      const ops = items.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.productId), quantity: { $gte: item.quantity } },
          update: { $inc: { quantity: -item.quantity, sold: item.quantity } },
        },
      }));

      const bulkRes = await db.collection('products').bulkWrite(ops as any, { ordered: true, session });

      const modified = bulkRes.modifiedCount ?? 0;
      if (modified !== items.length) {
        // conflict: abort and return conflict
        await session.abortTransaction();
        console.error('bulkWrite modified mismatch', { expected: items.length, modified, bulkRes });
        return NextResponse.json({ success: false, message: 'Stock update conflict. Please retry.' }, { status: 409 });
      }

      // Build history doc
      const lines = items.map((i) => {
        const p = productMap.get(i.productId) || {};
        const unitPrice = Number(p.price ?? 0);
        const name = String(p.name ?? '');
        const qty = toInt(i.quantity);
        return { productId: new mongoose.Types.ObjectId(i.productId), name, unitPrice, quantity: qty, subtotal: unitPrice * qty };
      });

      const totalQuantity = lines.reduce((s, l) => s + toInt(l.quantity), 0);
      const totalAmount = lines.reduce((s, l) => s + Number(l.subtotal || 0), 0);

      // Validate amountPaid
      if (!Number.isFinite(amountPaid) || amountPaid < totalAmount) {
        await session.abortTransaction();
        return NextResponse.json({
          success: false,
          message: `Amount paid is insufficient. Total is ${totalAmount.toFixed(2)}, paid ${Number(amountPaid).toFixed(2)}`,
        }, { status: 400 });
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
        totals: { quantity: totalQuantity, amount: totalAmount },
        payment: { amountPaid, change, currency: 'PHP' },
        createdAt: new Date(),
        type: 'checkout',
      };

      const insertRes = await db.collection('history').insertOne(historyDoc, { session });

      await session.commitTransaction();

      // --- Inventory alerts for items in this checkout (send AFTER commit) ---
      try {
        const DEFAULT_LOW_THRESHOLD = 10;

        // build set of ownerIds referenced by processed products
        const ownerIdSet = new Set<string>();
        for (const it of items) {
          const p = productMap.get(it.productId);
          if (!p) continue;
          if (p.ownerId) ownerIdSet.add(String(p.ownerId));
          else if (p.owner) ownerIdSet.add(String(p.owner)); // fallback if owner stored as string id
        }

        const ownerIds = Array.from(ownerIdSet)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        // fetch owner emails in one query
        const usersMap = new Map<string, any>();
        if (ownerIds.length > 0) {
          const owners = await db.collection('users').find({ _id: { $in: ownerIds } }, { projection: { email: 1 } }).toArray();
          for (const u of owners) usersMap.set(String(u._id), u);
        }

        const alerts: {
          to: string;
          itemName: string;
          sku?: string;
          currentQty: number;
          threshold: number;
          status: 'low' | 'out';
          manageUrl?: string;
        }[] = [];

        for (const item of items) {
          const p = productMap.get(item.productId);
          if (!p) continue;

          const origStock = toInt(p.quantity);
          const postStock = Math.max(0, origStock - toInt(item.quantity));

          const threshold = toInt(p.lowStockThreshold ?? DEFAULT_LOW_THRESHOLD);

          let status: 'low' | 'out' | null = null;
          if (postStock <= 0) status = 'out';
          else if (postStock <= threshold) status = 'low';

          if (!status) continue;

          // resolve owner email via ownerId lookup
          const ownerKey = p.ownerId ? String(p.ownerId) : p.owner ? String(p.owner) : null;
          const ownerDoc = ownerKey ? usersMap.get(ownerKey) : null;
          const ownerEmail = ownerDoc?.email ? String(ownerDoc.email).trim() : null;

          if (!ownerEmail) continue; // skip if we can't resolve email

          alerts.push({
            to: ownerEmail,
            itemName: String(p.name ?? item.productId),
            sku: p.sku ? String(p.sku) : undefined,
            currentQty: postStock,
            threshold,
            status,
            manageUrl: `${process.env.BASE_URL ?? ''}/inventory`,
          });
        }

        // send alerts asynchronously (do not block response)
        if (alerts.length > 0) {
          Promise.allSettled(alerts.map((a) => sendInventoryAlert(a as any))).then((results) => {
            for (const r of results) {
              if (r.status === 'rejected') console.error('Inventory alert failed to send', r);
            }
          }).catch((e) => console.error('Unexpected error sending inventory alerts', e));
        }
      } catch (e) {
        console.error('Error preparing/sending inventory alerts:', e);
      }

      // --- Recent activity log: record checkout action ---
      try {
        const actorName = user?.username || user?.name || user?.email || 'unknown';
        await db.collection('recent_activities').insertOne({
          action: 'Checkout',
          username: actorName,
          createdAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to log recent activity (checkout):', e);
      }

      const resultSummary = {
        transactionId: String(insertRes.insertedId),
        totals: historyDoc.totals,
        items: lines,
        payment: historyDoc.payment,
        createdAt: historyDoc.createdAt,
      };

      return NextResponse.json({ success: true, message: 'Checkout successful', data: resultSummary }, { status: 200 });
    } catch (err: any) {
      // Ensure abort and rethrow to outer catch which returns 400/500 appropriately
      try { await session.abortTransaction(); } catch (e) { /* ignore */ }
      console.error('Transaction error in checkout:', err);
      // If error has user-facing message return 400, otherwise 500
      const msg = err?.message || 'Checkout failed';
      const status = msg && (msg.includes('Insufficient') || msg.includes('Invalid') || msg.includes('No items')) ? 400 : 500;
      return NextResponse.json({ success: false, message: msg }, { status });
    }
  } catch (error) {
    console.error('Checkout handler error:', error);
    return NextResponse.json({ success: false, message: 'Internal Error', error: String(error) }, { status: 500 });
  } finally {
    if (session) {
      try { await session.endSession(); } catch (e) { /* ignore */ }
    }
  }
}

export async function POST(request: NextRequest) { return handleCheckout(request); }
export async function PATCH(request: NextRequest) { return handleCheckout(request); }