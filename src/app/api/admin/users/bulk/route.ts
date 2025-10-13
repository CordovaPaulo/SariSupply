import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

type IncomingUser = { email?: string; username?: string; role?: string };

export async function POST(req: NextRequest) {
  try {
    // Try to read multipart/form-data first (file upload)
    let users: IncomingUser[] | null = null;

    try {
      const formData = await req.formData();
      const file = formData.get('file');
      if (file && typeof file !== 'string') {
        const text = await (file as Blob).text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) users = parsed;
          else if (parsed && Array.isArray(parsed.users)) users = parsed.users;
        } catch {
          return NextResponse.json(
            { success: false, message: 'Invalid JSON in uploaded file' },
            { status: 400 }
          );
        }
      }
    } catch {
      // Not form-data; will try JSON body next
    }

    // Fallback: application/json body (backwards compat)
    if (!users) {
      const json = await req.json().catch(() => null as any);
      if (Array.isArray(json)) users = json;
      else if (json && Array.isArray(json.users)) users = json.users;
    }

    if (!Array.isArray(users)) {
      return NextResponse.json(
        { success: false, message: 'Provide a JSON file or JSON body with an array of users' },
        { status: 400 }
      );
    }

    const { db } = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      );
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{
      index: number;
      email: string;
      username: string;
      status: 'created' | 'skipped' | 'error';
      message?: string;
      defaultPassword?: string;
    }> = [];

    for (let i = 0; i < users.length; i++) {
      const raw: IncomingUser = users[i] ?? {};
      const email = typeof raw.email === 'string' ? raw.email.trim() : '';
      const username = typeof raw.username === 'string' ? raw.username.trim() : '';
      const role = typeof raw.role === 'string' ? raw.role : 'user';

      if (!email || !username) {
        results.push({
          index: i,
          email,
          username,
          status: 'error',
          message: 'Missing email or username',
        });
        errors++;
        continue;
      }

      try {
        const existingUser = await db.collection('users').findOne({
          $or: [{ email }, { username }],
        });

        if (existingUser) {
          results.push({
            index: i,
            email,
            username,
            status: 'skipped',
            message: 'User already exists',
          });
          skipped++;
          continue;
        }

        const defaultPassword = email.split('@')[0];
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        const now = new Date();
        const newUser = {
          username,
          email,
          password: hashedPassword,
          role,
          createdAt: now,
          updatedAt: now,
        };

        await db.collection('users').insertOne(newUser);

        results.push({
          index: i,
          email,
          username,
          status: 'created',
          defaultPassword,
        });
        created++;
      } catch (err: any) {
        results.push({
          index: i,
          email,
          username,
          status: 'error',
          message: err?.message ?? 'Unknown error',
        });
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        created,
        skipped,
        errors,
        total: users.length,
      },
      results,
    });
  } catch (e: any) {
    console.error('POST /api/admin/users/bulk error:', e);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
