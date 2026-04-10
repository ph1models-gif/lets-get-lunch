'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const PASSWORD = 'lunch2026'

type Vendor = {
  id: string
  business_name: string
  cuisine_type: string
  neighborhood: string
  address: string
  hours: string
  deal_title: string
  deal_description: string
  contact_email: string
  contact_phone: string
  photo_url: string | null
  photo_urls: string[] | null
  status: string
  created_at: string
}

type Restaurant = {
  id: string
  name: string
  cuisine: string
  neighborhood: string
  address: string
  hours: string
  photo_url: string | null
  photo_urls: string[] | null
  is_active: boolean
  lat: number | null
  lng: number | null
}

type Deal = {
  id: string
  restaurant_id: string
  title: string
  description: string
  is_active: boolean
}

const NEIGHBORHOODS = [
  'Chelsea', 'Chinatown', 'East Village', 'Financial District',
  'Flatiron', 'Greenwich Village', 'Hell\'s Kitchen', 'Lower East Side',
  'Midtown', 'Murray Hill', 'NoHo', 'Nolita', 'SoHo', 'Tribeca',
  'Upper East Side', 'Upper West Side', 'West Village', 'Williamsburg'
]

const CUISINES = [
  'American', 'Chinese', 'French', 'Greek', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Middle Eastern',
  'Pizza', 'Sandwiches/Deli', 'Seafood', 'Spanish', 'Thai', 'Vietnamese'
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState<'pending' | 'restaurants'>('pending')

  // Pending
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorLoading, setVendorLoading] = useState(false)

  // Restaurants
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [restLoading, setRestLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Restaurant & { deal_title: string; deal_description: string }>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (authed && tab === 'pending') fetchVendors()
    if (authed && tab === 'restaurants') fetchRestaurants()
  }, [authed, tab])

  async function fetchVendors() {
    setVendorLoading(true)
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setVendors(data || [])
    setVendorLoading(false)
  }

  async function fetchRestaurants() {
    setRestLoading(true)
    const [{ data: rests }, { data: dealData }] = await Promise.all([
      supabase.from('restaurants').select('*').order('name'),
      supabase.from('deals').select('*'),
    ])
    setRestaurants(rests || [])
    setDeals(dealData || [])
    setRestLoading(false)
  }

  async function approveVendor(vendor: Vendor) {
    const { data: rest } = await supabase
      .from('restaurants')
      .insert({
        name: vendor.business_name,
        cuisine: vendor.cuisine_type,
        neighborhood: vendor.neighborhood,
        address: vendor.address,
        hours: vendor.hours,
        photo_url: vendor.photo_url,
        photo_urls: vendor.photo_urls,
        is_active: true,
      })
      .select()
      .single()

    if (rest) {
      await supabase.from('deals').insert({
        restaurant_id: rest.id,
        title: vendor.deal_title,
        description: vendor.deal_description,
        is_active: true,
      })
    }

    await supabase.from('vendors').update({ status: 'approved' }).eq('id', vendor.id)
    fetchVendors()
  }

  async function rejectVendor(id: string) {
    await supabase.from('vendors').update({ status: 'rejected' }).eq('id', id)
    fetchVendors()
  }

  function startEdit(r: Restaurant) {
    const deal = deals.find(d => d.restaurant_id === r.id)
    setEditingId(r.id)
    setEditForm({
      name: r.name,
      cuisine: r.cuisine,
      neighborhood: r.neighborhood,
      address: r.address,
      hours: r.hours,
      lat: r.lat,
      lng: r.lng,
      deal_title: deal?.title || '',
      deal_description: deal?.description || '',
    })
  }

  async function saveEdit(r: Restaurant) {
    setSaving(true)
    await supabase.from('restaurants').update({
      name: editForm.name,
      cuisine: editForm.cuisine,
      neighborhood: editForm.neighborhood,
      address: editForm.address,
      hours: editForm.hours,
      lat: editForm.lat || null,
      lng: editForm.lng || null,
    }).eq('id', r.id)

    const deal = deals.find(d => d.restaurant_id === r.id)
    if (deal) {
      await supabase.from('deals').update({
        title: editForm.deal_title,
        description: editForm.deal_description,
      }).eq('id', deal.id)
    } else if (editForm.deal_title) {
      await supabase.from('deals').insert({
        restaurant_id: r.id,
        title: editForm.deal_title,
        description: editForm.deal_description,
        is_active: true,
      })
    }

    setSaving(false)
    setEditingId(null)
    fetchRestaurants()
  }

  async function toggleActive(r: Restaurant) {
    await supabase.from('restaurants').update({ is_active: !r.is_active }).eq('id', r.id)
    fetchRestaurants()
  }

  async function deleteRestaurant(id: string) {
    await supabase.from('deals').delete().eq('restaurant_id', id)
    await supabase.from('restaurants').delete().eq('id', id)
    setConfirmDelete(null)
    fetchRestaurants()
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin login</h1>
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pw === PASSWORD && setAuthed(true)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={() => pw === PASSWORD ? setAuthed(true) : alert('Wrong password')}
            className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600"
          >
            Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin dashboard</h1>
          <a href="/" className="text-sm text-orange-500 hover:underline">← Back to site</a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['pending', 'restaurants'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'pending' ? 'Pending submissions' : 'Active listings'}
            </button>
          ))}
        </div>

        {/* ── PENDING TAB ── */}
        {tab === 'pending' && (
          <>
            {vendorLoading && <p className="text-gray-500 text-sm">Loading…</p>}
            {!vendorLoading && vendors.length === 0 && (
              <p className="text-gray-500 text-sm">No pending submissions.</p>
            )}
            {vendors.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{v.business_name}</h2>
                    <p className="text-sm text-gray-500">{v.cuisine_type} · {v.neighborhood}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                {v.photo_url && (
                  <img src={v.photo_url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />
                )}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-3">
                  <div><span className="font-medium">Address:</span> {v.address}</div>
                  <div><span className="font-medium">Hours:</span> {v.hours}</div>
                  <div><span className="font-medium">Email:</span> {v.contact_email}</div>
                  <div><span className="font-medium">Phone:</span> {v.contact_phone}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-orange-800">{v.deal_title}</p>
                  <p className="text-orange-700">{v.deal_description}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => approveVendor(v)}
                    className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectVendor(v.id)}
                    className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 text-sm font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── RESTAURANTS TAB ── */}
        {tab === 'restaurants' && (
          <>
            {restLoading && <p className="text-gray-500 text-sm">Loading…</p>}
            {!restLoading && restaurants.length === 0 && (
              <p className="text-gray-500 text-sm">No restaurants yet.</p>
            )}
            {restaurants.map(r => {
              const deal = deals.find(d => d.restaurant_id === r.id)
              const isEditing = editingId === r.id

              return (
                <div key={r.id} className={`bg-white rounded-xl border mb-4 overflow-hidden ${r.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                  {/* Header row */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {!r.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>
                      )}
                      <h2 className="font-semibold text-gray-900">{r.name}</h2>
                      <span className="text-sm text-gray-400">{r.cuisine} · {r.neighborhood}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(r)}
                            className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${
                              r.is_active
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-green-200 text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {r.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r.id)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Confirm delete */}
                  {confirmDelete === r.id && (
                    <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                      <p className="text-sm text-red-700 font-medium">Permanently delete <strong>{r.name}</strong> and all its deals?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteRestaurant(r.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
                        >
                          Yes, delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing ? (
                    <div className="px-6 py-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Cuisine</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.cuisine || ''} onChange={e => setEditForm(f => ({ ...f, cuisine: e.target.value }))}>
                            {CUISINES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Neighborhood</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.neighborhood || ''} onChange={e => setEditForm(f => ({ ...f, neighborhood: e.target.value }))}>
                            {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
                          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.hours || ''} onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                            <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.lat || ''} onChange={e => setEditForm(f => ({ ...f, lat: parseFloat(e.target.value) }))} placeholder="40.7128" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                            <input type="number" step="any" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.lng || ''} onChange={e => setEditForm(f => ({ ...f, lng: parseFloat(e.target.value) }))} placeholder="-74.0060" />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-600 mb-3">Lunch deal</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Deal title</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.deal_title || ''} onChange={e => setEditForm(f => ({ ...f, deal_title: e.target.value }))} placeholder="e.g. $15 lunch special" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Deal description</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.deal_description || ''} onChange={e => setEditForm(f => ({ ...f, deal_description: e.target.value }))} placeholder="What's included" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => saveEdit(r)}
                          disabled={saving}
                          className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only row */
                    <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><span className="text-gray-400">Address</span><br />{r.address || '—'}</div>
                      <div><span className="text-gray-400">Hours</span><br />{r.hours || '—'}</div>
                      <div><span className="text-gray-400">Deal</span><br />{deal?.title || '—'}</div>
                      <div><span className="text-gray-400">Lat/lng</span><br />{r.lat && r.lng ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : <span className="text-amber-600">Missing — won't show on map</span>}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
