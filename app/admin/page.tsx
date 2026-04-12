'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const PASSWORD = 'lunch2026'

type Vendor = {
  id: string
  restaurant_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  neighborhood: string
  cuisine: string
  seats: string
  hours: string
  special: string
  price: string
  work_friendly: string
  wifi: string
  message: string
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
  bio: string | null
  photo_url: string | null
  photo_urls: string[] | null
  is_active: boolean
  lat: number | null
  lng: number | null
}

type Deal = {
  id: string
  restaurant_id: string
  special: string
  price: number
  is_active: boolean
}

const NEIGHBORHOODS = [
  'Chelsea', 'Chinatown', 'East Village', 'Financial District',
  'Flatiron', 'Greenwich Village', "Hell's Kitchen", 'Lower East Side',
  'Midtown', 'Murray Hill', 'NoHo', 'Nolita', 'SoHo', 'Tribeca',
  'Upper East Side', 'Upper West Side', 'West Village', 'Williamsburg'
]

const CUISINES = [
  'American', 'Asian', 'Chinese', 'French', 'French Seafood', 'Greek', 'Indian', 'Italian',
  'Japanese', 'Japanese/Sushi', 'Korean', 'Mediterranean', 'Mexican', 'Mexican/Latin', 'Middle Eastern',
  'Pizza', 'Sandwiches/Deli', 'Seafood', 'Spanish', 'Thai', 'Vegan/Plant-Based', 'Vietnamese'
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState<'pending' | 'restaurants'>('pending')

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorLoading, setVendorLoading] = useState(false)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [restLoading, setRestLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Restaurant & { deal_special: string; deal_price: string }>>({})
  const [editMainFile, setEditMainFile] = useState<File | null>(null)
  const [editMainPreview, setEditMainPreview] = useState<string | null>(null)
  const [editExtraFiles, setEditExtraFiles] = useState<File[]>([])
  const [editExtraPreviews, setEditExtraPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (authed && tab === 'pending') fetchVendors()
    if (authed && tab === 'restaurants') fetchRestaurants()
  }, [authed, tab])

  async function fetchVendors() {
    setVendorLoading(true)
    const { data } = await supabase.from('vendors').select('*').eq('status', 'pending').order('created_at', { ascending: false })
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
    let lat: number | null = null
    let lng: number | null = null
    try {
      const geo = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(vendor.address + ', New York, NY')}&key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0`)
      const geoData = await geo.json()
      if (geoData.results?.[0]?.geometry?.location) {
        lat = geoData.results[0].geometry.location.lat
        lng = geoData.results[0].geometry.location.lng
      }
    } catch (e) { console.error('Geocoding failed:', e) }

    const { data: rest } = await supabase.from('restaurants').insert({
      name: vendor.restaurant_name,
      cuisine: vendor.cuisine,
      neighborhood: vendor.neighborhood,
      address: vendor.address,
      hours: vendor.hours,
      photo_url: vendor.photo_url,
      photo_urls: vendor.photo_urls,
      is_active: true, lat, lng,
    }).select().single()

    if (rest) {
      await supabase.from('deals').insert({
        restaurant_id: rest.id,
        special: vendor.special,
        price: parseFloat(vendor.price.replace('$', '')) || 0,
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
    setEditMainFile(null)
    setEditMainPreview(null)
    setEditExtraFiles([])
    setEditExtraPreviews([])
    setEditForm({
      name: r.name,
      cuisine: r.cuisine,
      neighborhood: r.neighborhood,
      address: r.address,
      hours: r.hours,
      bio: r.bio || '',
      photo_url: r.photo_url,
      photo_urls: r.photo_urls || [],
      lat: r.lat,
      lng: r.lng,
      deal_special: deal?.special || '',
      deal_price: deal?.price?.toString() || '',
    })
  }

  async function saveEdit(r: Restaurant) {
    setSaving(true)

    let finalPhotoUrl = editForm.photo_url || null
    let finalPhotoUrls = editForm.photo_urls || []

    // Upload new main photo if selected
    if (editMainFile) {
      const ext = editMainFile.name.split('.').pop()
      const path = `${r.id}-main-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('restaurant-photos').upload(path, editMainFile, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(path)
        finalPhotoUrl = urlData.publicUrl
      }
    }

    // Upload new extra photos if selected
    if (editExtraFiles.length > 0) {
      const newUrls: string[] = []
      for (const file of editExtraFiles) {
        const ext = file.name.split('.').pop()
        const path = `${r.id}-extra-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('restaurant-photos').upload(path, file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(path)
          newUrls.push(urlData.publicUrl)
        }
      }
      finalPhotoUrls = [...(editForm.photo_urls || []), ...newUrls].slice(0, 3)
    }

    await supabase.from('restaurants').update({
      name: editForm.name,
      cuisine: editForm.cuisine,
      neighborhood: editForm.neighborhood,
      address: editForm.address,
      hours: editForm.hours,
      bio: editForm.bio || null,
      photo_url: finalPhotoUrl,
      photo_urls: finalPhotoUrls,
      lat: editForm.lat || null,
      lng: editForm.lng || null,
    }).eq('id', r.id)

    const deal = deals.find(d => d.restaurant_id === r.id)
    if (deal) {
      await supabase.from('deals').update({
        special: editForm.deal_special,
        price: parseFloat(editForm.deal_price || '0'),
      }).eq('id', deal.id)
    } else if (editForm.deal_special) {
      await supabase.from('deals').insert({
        restaurant_id: r.id,
        special: editForm.deal_special,
        price: parseFloat(editForm.deal_price || '0'),
        is_active: true,
      })
    }

    setSaving(false)
    setEditingId(null)
    fetchRestaurants()
  }

  async function toggleActive(r: Restaurant) {
    await supabase.from('restaurants').update({ is_active: !r.is_active }).eq('id', r.id)
    setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
  }

  async function deleteRestaurant(id: string) {
    await supabase.from('deals').delete().eq('restaurant_id', id)
    await supabase.from('restaurants').delete().eq('id', id)
    setRestaurants(prev => prev.filter(x => x.id !== id))
    setConfirmDelete(null)
  }

  function removeExistingPhoto(url: string) {
    setEditForm(f => ({ ...f, photo_urls: (f.photo_urls || []).filter(u => u !== url) }))
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin login</h1>
          <input type="password" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pw === PASSWORD && setAuthed(true)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={() => pw === PASSWORD ? setAuthed(true) : alert('Wrong password')}
            className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600">
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
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchVendors(); fetchRestaurants(); }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">↻ Refresh</button>
            <a href="/" className="text-sm text-orange-500 hover:underline">← Back to site</a>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(['pending', 'restaurants'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'pending' ? 'Pending submissions' : 'Active listings'}
            </button>
          ))}
        </div>

        {/* PENDING TAB */}
        {tab === 'pending' && (
          <>
            {vendorLoading && <p className="text-gray-500 text-sm">Loading…</p>}
            {!vendorLoading && vendors.length === 0 && <p className="text-gray-500 text-sm">No pending submissions.</p>}
            {vendors.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{v.restaurant_name}</h2>
                    <p className="text-sm text-gray-500">{v.cuisine} · {v.neighborhood}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                {v.photo_url && <img src={v.photo_url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />}
                {v.photo_urls && v.photo_urls.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {v.photo_urls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-24 h-16 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-3">
                  <div><span className="font-medium">Address:</span> {v.address}</div>
                  <div><span className="font-medium">Hours:</span> {v.hours}</div>
                  <div><span className="font-medium">Email:</span> {v.email}</div>
                  <div><span className="font-medium">Phone:</span> {v.phone}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-orange-800">{v.special}</p>
                  <p className="text-orange-700">{v.price}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => approveVendor(v)} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Approve</button>
                  <button onClick={() => rejectVendor(v.id)} className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 text-sm font-medium hover:bg-red-200">Reject</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* RESTAURANTS TAB */}
        {tab === 'restaurants' && (
          <>
            {restLoading && <p className="text-gray-500 text-sm">Loading…</p>}
            {!restLoading && restaurants.length === 0 && <p className="text-gray-500 text-sm">No restaurants yet.</p>}
            {restaurants.map(r => {
              const deal = deals.find(d => d.restaurant_id === r.id)
              const isEditing = editingId === r.id
              return (
                <div key={r.id} className={`bg-white rounded-xl border mb-4 overflow-hidden ${r.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {!r.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                      {r.photo_url && <img src={r.photo_url} alt="" className="w-10 h-10 object-cover rounded-lg" />}
                      <h2 className="font-semibold text-gray-900">{r.name}</h2>
                      <span className="text-sm text-gray-400">{r.cuisine} · {r.neighborhood}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <button onClick={() => startEdit(r)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Edit</button>
                          <button onClick={() => toggleActive(r)}
                            className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${r.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                            {r.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button onClick={() => setConfirmDelete(r.id)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Confirm delete */}
                  {confirmDelete === r.id && (
                    <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                      <p className="text-sm text-red-700 font-medium">Permanently delete <strong>{r.name}</strong> and all its deals?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(null)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white">Cancel</button>
                        <button onClick={() => deleteRestaurant(r.id)} className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Yes, delete</button>
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

                      {/* Bio */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">One-line bio</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.bio || ''} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="e.g. Hip, airy eatery with Asian-inspired vegan dishes" maxLength={120} />
                      </div>

                      {/* Deal */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-600 mb-3">Lunch deal</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Deal description</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.deal_special || ''} onChange={e => setEditForm(f => ({ ...f, deal_special: e.target.value }))} placeholder="e.g. Pasta + salad + dessert" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Price ($)</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.deal_price || ''} onChange={e => setEditForm(f => ({ ...f, deal_price: e.target.value }))} placeholder="e.g. 29" />
                          </div>
                        </div>
                      </div>

                      {/* Photos */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-600 mb-3">Photos</p>

                        {/* Current main photo */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Main photo</p>
                          {editMainPreview ? (
                            <div className="relative w-40">
                              <img src={editMainPreview} alt="" className="w-40 h-28 object-cover rounded-lg" />
                              <button onClick={() => { setEditMainFile(null); setEditMainPreview(null) }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                            </div>
                          ) : editForm.photo_url ? (
                            <div className="relative w-40">
                              <img src={editForm.photo_url} alt="" className="w-40 h-28 object-cover rounded-lg" />
                              <label className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded cursor-pointer">
                                Replace
                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (f) { setEditMainFile(f); setEditMainPreview(URL.createObjectURL(f)) }
                                }} />
                              </label>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 text-sm text-orange-500 cursor-pointer border border-dashed border-orange-300 rounded-lg px-4 py-3 w-40 justify-center">
                              + Add photo
                              <input type="file" accept="image/*" className="hidden" onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) { setEditMainFile(f); setEditMainPreview(URL.createObjectURL(f)) }
                              }} />
                            </label>
                          )}
                        </div>

                        {/* Extra photos */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Extra photos (up to 3)</p>
                          <div className="flex gap-2 flex-wrap">
                            {(editForm.photo_urls || []).map((url, i) => (
                              <div key={i} className="relative">
                                <img src={url} alt="" className="w-24 h-16 object-cover rounded-lg" />
                                <button onClick={() => removeExistingPhoto(url)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">×</button>
                              </div>
                            ))}
                            {editExtraPreviews.map((url, i) => (
                              <div key={`new-${i}`} className="relative">
                                <img src={url} alt="" className="w-24 h-16 object-cover rounded-lg border-2 border-orange-300" />
                                <button onClick={() => {
                                  setEditExtraFiles(f => f.filter((_, j) => j !== i))
                                  setEditExtraPreviews(p => p.filter((_, j) => j !== i))
                                }} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">×</button>
                              </div>
                            ))}
                            {((editForm.photo_urls?.length || 0) + editExtraPreviews.length) < 3 && (
                              <label className="w-24 h-16 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-orange-300">
                                + Add
                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (f) {
                                    setEditExtraFiles(prev => [...prev, f])
                                    setEditExtraPreviews(prev => [...prev, URL.createObjectURL(f)])
                                  }
                                }} />
                              </label>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Best size: 1200×800px landscape, under 5MB</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button onClick={() => saveEdit(r)} disabled={saving}
                          className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                          {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><span className="text-gray-400">Address</span><br />{r.address || '—'}</div>
                      <div><span className="text-gray-400">Hours</span><br />{r.hours || '—'}</div>
                      <div><span className="text-gray-400">Deal</span><br />{deal?.special || '—'}</div>
                      <div><span className="text-gray-400">Bio</span><br />{r.bio || <span className="text-gray-300">None</span>}</div>
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
