import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('AUTH: DATABASE_URL not configured');
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const sql = neon(databaseUrl);
    const rows = await sql`SELECT * FROM users WHERE username = ${username} AND password = ${password} LIMIT 1`;
    
    if (rows && rows.length > 0) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch (error) {
    console.error('AUTH error:', error);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
