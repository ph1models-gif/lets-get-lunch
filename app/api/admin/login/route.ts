import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const secret = process.env.ADMIN_SECRET
    if (!secret) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
    }
    if (typeof password === 'string' && password === secret) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false }, { status: 401 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }
}
