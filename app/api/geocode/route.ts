import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'no address' }, { status: 400 })
  const key = process.env.GOOGLE_GEOCODING_KEY
  if (!key) return NextResponse.json({ error: 'no key' }, { status: 500 })
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', New York, NY')}&key=${key}`
    const r = await fetch(url)
    const data = await r.json()
    const loc = data.results?.[0]?.geometry?.location
    if (loc) return NextResponse.json({ lat: loc.lat, lng: loc.lng })
    return NextResponse.json({ lat: null, lng: null, status: data.status })
  } catch (e) {
    return NextResponse.json({ lat: null, lng: null, error: 'fetch failed' })
  }
}
