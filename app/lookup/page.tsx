'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { NEIGHBORHOODS } from '../../lib/neighborhoods'
import { CUISINES } from '../../lib/cuisines'

const PASSWORD = 'olga2026'

export default function LookupPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hood, setHood] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!authed) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('restaurants')
        .select('id,name,cuisine,neighborhood,address')
        .eq('is_active', true)
        .order('name')
      setRestaurants(data || [])
      setLoading(false)
    })()
  }, [authed])

  function copyUrl(id: string) {
    const url = 'https://www.letsgetlunch.nyc/restaurants/' + id
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = restaurants.filter(r => {
    const s = search.trim().toLowerCase()
    const matchSearch = !s || (r.name || '').toLowerCase().includes(s) || (r.address || '').toLowerCase().includes(s)
    const matchHood = !hood || r.neighborhood === hood
    const matchCuisine = !cuisine || r.cuisine === cuisine
    return matchSearch && matchHood && matchCuisine
  })

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: 320 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#111827' }}>Restaurant Lookup</h1>
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (pw === PASSWORD ? setAuthed(true) : alert('Wrong password')) }}
            style={{ width: '100%', fontSize: 16, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12 }}
          />
          <button
            onClick={() => pw === PASSWORD ? setAuthed(true) : alert('Wrong password')}
            style={{ width: '100%', background: '#4A9FD5', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Restaurant Lookup</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Find a restaurant and copy its live page link.</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Search name or address"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', fontSize: 16, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <select value={hood} onChange={e => setHood(e.target.value)} style={{ fontSize: 16, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
            <option value="">All neighborhoods</option>
            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={cuisine} onChange={e => setCuisine(e.target.value)} style={{ fontSize: 16, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
            <option value="">All cuisines</option>
            {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
          {loading ? 'Loading...' : filtered.length + ' of ' + restaurants.length + ' listings'}
        </p>

        {filtered.map(r => {
          const url = 'letsgetlunch.nyc/restaurants/' + r.id
          return (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{r.name}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>{r.cuisine} · {r.neighborhood}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{r.address}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <a href={'https://www.' + url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#4A9FD5', textDecoration: 'none', wordBreak: 'break-all' }}>{url}</a>
                <button onClick={() => copyUrl(r.id)} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #4A9FD5', color: copiedId === r.id ? '#fff' : '#4A9FD5', background: copiedId === r.id ? '#4A9FD5' : '#fff', borderRadius: 6, cursor: 'pointer' }}>
                  {copiedId === r.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
