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
  "Midtown","Midtown East","Midtown West","Upper East Side","Upper West Side",
  "Chelsea","West Village","Greenwich Village","SoHo","NoHo","Tribeca",
  "Financial District","Lower East Side","East Village","Gramercy Park",
  "Murray Hill","Kips Bay","Harlem","Hell's Kitchen","Chinatown","Little Italy",
  "Battery Park City","Union Square","Flatiron","NoMad","Lenox Hill","Yorkville","Washington Heights",
  "Inwood","Morningside Heights","Williamsburg","Dumbo","Brooklyn Heights",
  "Park Slope","Cobble Hill","Carroll Gardens","Boerum Hill","Fort Greene",
  "Clinton Hill","Bushwick","Greenpoint","Red Hook","Crown Heights",
  "Prospect Heights","Downtown Brooklyn","Astoria","Long Island City",
  "Flushing","Jackson Heights","Forest Hills","Sunnyside","Ridgewood",
  "Fordham","Riverdale","Mott Haven","St. George","Stapleton","Nolita","Little Italy","Two Bridges","Turtle Bay","Sutton Place","Hudson Yards","Carnegie Hill","East Harlem","Hamilton Heights","Sugar Hill","Bed-Stuy","Bay Ridge","Sunset Park","Windsor Terrace","Prospect Lefferts Gardens","Flatbush","Woodside","Rego Park","Elmhurst","Corona"
];

const CUISINES = [
  "American","Italian","Japanese/Sushi","French","Mexican/Latin",
  "Chinese","Indian","Mediterranean","Greek","Thai","Korean",
  "Vietnamese","Middle Eastern","Seafood","Steakhouse","BBQ",
  "Vegan/Plant-Based","Bakery/Cafe","Other"
];

const HOURS_OPTIONS = [
  "10:30am–2pm","10:30am–2:30pm","10:30am–3pm","10:30am–3:30pm",
  "11am–2pm","11am–2:30pm","11am–3pm","11am–3:30pm","11am–4pm","11am–4:30pm",
  "11:30am–2pm","11:30am–2:30pm","11:30am–3pm","11:30am–3:30pm","11:30am–4pm","11:30am–4:30pm",
  "12pm–2pm","12pm–2:30pm","12pm–3pm","12pm–3:30pm","12pm–4pm","12pm–4:30pm"
];


function ReservationsView({ reservations, resView }: { reservations: any[], resView: string }) {
  const today = new Date().toDateString()
  const filtered = resView === 'today'
    ? reservations.filter(r => new Date(r.created_at).toDateString() === today)
    : reservations

  const contactCount: Record<string, number> = {}
  const contactRestaurants: Record<string, number> = {}
  reservations.forEach(r => {
    const key = (r.contact || r.name || '').toLowerCase()
    contactCount[key] = (contactCount[key] || 0) + 1
    if (!contactRestaurants[key]) contactRestaurants[key] = 0
    contactRestaurants[key]++
  })

  if (filtered.length === 0) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🍽️</p>
      <p className="text-gray-400 text-sm">{resView === 'today' ? 'No reservations today yet' : 'No reservations yet'}</p>
    </div>
  )

  const repeatCount = Object.values(contactCount).filter(c => c > 1).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{filtered.length}</p>
          <p className="text-xs text-gray-500 mt-1">{resView === 'today' ? "Today" : 'Total'} reservations</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#4A9FD5]">{filtered.reduce((a: number, r: any) => a + (r.party_size || 1), 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Total guests</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{repeatCount}</p>
          <p className="text-xs text-gray-500 mt-1">Repeat bookers</p>
        </div>
      </div>
      {filtered.map((r: any) => {
        const key = (r.contact || r.name || '').toLowerCase()
        const bookCount = contactCount[key] || 1
        const isRepeat = bookCount > 1
        const bookedAt = new Date(r.created_at)
        const timeStr = bookedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        const dateStr = bookedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  {isRepeat && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      🔁 {bookCount}x booker
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{r.contact}</p>
              </div>
              <span className="text-xs font-mono bg-[#EEF6FC] text-[#4A9FD5] px-2 py-1 rounded-lg font-bold">{r.code || r.confirmation_code}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>🍽️ {r.restaurants?.name || '—'}</span>
              <span>👥 Party of {r.party_size}</span>
              <span>🕐 {r.preferred_time}</span>
              <span>📅 {dateStr} at {timeStr}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState<'pending' | 'restaurants' | 'reservations' | 'add' | 'users' | 'contacts'>('pending')

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
  const [addForm, setAddForm] = useState({
    name: '', address: '', neighborhood: '', cuisine: '', hours: '',
    bio: '', special: '', price: '', work_friendly: false, wifi: false,
    days: ['Mon','Tue','Wed','Thu','Fri'],
    contact_name: '', contact_email: '', contact_phone: ''
  })
  const [addMainFile, setAddMainFile] = useState<File | null>(null)
  const [addExtraFiles, setAddExtraFiles] = useState<File[]>([])
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [vendorMainFile, setVendorMainFile] = useState<File | null>(null)
  const [vendorExtraFiles, setVendorExtraFiles] = useState<File[]>([])
  const [vendorEditForm, setVendorEditForm] = useState<any>({})
  const [addSaving, setAddSaving] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')
  const [addError, setAddError] = useState('')
  const [allVendorContacts, setAllVendorContacts] = useState<any[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [reservations, setReservations] = useState<any[]>([])
  const [resLoading, setResLoading] = useState(true)
  const [resView, setResView] = useState<'today' | 'all'>('today')

  useEffect(() => {
    if (authed && tab === 'pending') fetchVendors()
    if (authed && tab === 'restaurants') { fetchRestaurants(); fetchAllVendors(); }
    if (authed && tab === 'reservations') fetchReservations()
    if (authed && tab === 'users') fetchUsers()
    if (authed && tab === 'contacts') fetchContacts()
  }, [authed, tab])

  async function fetchAllVendors() {
    const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
    setVendors(data || [])
  }

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

  async function fetchContacts() {
    setContactsLoading(true)
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false })
    setAllVendorContacts(data || [])
    setContactsLoading(false)
  }

  async function fetchUsers() {
    setUsersLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setUsersLoading(false)
  }

  async function fetchReservations() {
    setResLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*, restaurants(name)')
      .order('created_at', { ascending: false })
    setReservations(data || [])
    setResLoading(false)
  }

  async function submitNewRestaurant() {
    setAddSaving(true)
    setAddError('')
    setAddSuccess('')

    if (!addForm.name || !addForm.address || !addForm.neighborhood || !addForm.cuisine || !addForm.hours || !addForm.special || !addForm.price) {
      setAddError('Please fill in all required fields.')
      setAddSaving(false)
      return
    }

    // Geocode address
    let lat = null, lng = null
    try {
      const geo = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addForm.address + ', New York, NY')}&key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0`)
      const geoData = await geo.json()
      if (geoData.results?.[0]?.geometry?.location) {
        lat = geoData.results[0].geometry.location.lat
        lng = geoData.results[0].geometry.location.lng
      }
    } catch(e) {}

    // Upload main photo
    let photoUrl = null
    let photoUrls: string[] = []
    if (addMainFile) {
      const ext = addMainFile.name.split('.').pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('restaurant-photos').upload(filePath, addMainFile, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(filePath)
        photoUrl = urlData.publicUrl
      }
    }
    for (const file of addExtraFiles) {
      const ext = file.name.split('.').pop()
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('restaurant-photos').upload(filePath, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(filePath)
        photoUrls.push(urlData.publicUrl)
      }
    }

    // Insert restaurant
    const { data: rest } = await supabase.from('restaurants').insert({
      name: addForm.name,
      address: addForm.address,
      neighborhood: addForm.neighborhood,
      cuisine: addForm.cuisine,
      hours: addForm.hours,
      bio: addForm.bio || null,
      work_friendly: addForm.work_friendly,
      wifi: addForm.wifi,
      photo_url: photoUrl,
      photo_urls: photoUrls,
      is_active: true,
      lat, lng,
    }).select().single()

    if (rest) {
      await supabase.from('deals').insert({
        restaurant_id: rest.id,
        special: addForm.special,
        price: parseFloat(addForm.price),
        days: addForm.days,
        is_active: true,
      })
      // Also save to vendors table for contact tracking
      await supabase.from('vendors').insert({
        restaurant_name: addForm.name,
        contact_name: addForm.contact_name,
        email: addForm.contact_email,
        phone: addForm.contact_phone,
        address: addForm.address,
        neighborhood: addForm.neighborhood,
        cuisine: addForm.cuisine,
        hours: addForm.hours,
        special: addForm.special,
        price: addForm.price,
        work_friendly: addForm.work_friendly ? 'yes' : 'no',
        wifi: addForm.wifi ? 'yes' : 'no',
        bio: addForm.bio || null,
        days: addForm.days,
        status: 'approved',
      })
      setAddSuccess(`✅ ${addForm.name} added and live on the site!`)
      setAddForm({ name: '', address: '', neighborhood: '', cuisine: '', hours: '', bio: '', special: '', price: '', work_friendly: false, wifi: false, days: ['Mon','Tue','Wed','Thu','Fri'], contact_name: '', contact_email: '', contact_phone: '' })
      setAddMainFile(null)
      setAddExtraFiles([])
    } else {
      setAddError('Failed to save restaurant. Try again.')
    }
    setAddSaving(false)
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
      bio: vendor.bio || null,
      work_friendly: vendor.work_friendly === 'yes',
      wifi: vendor.wifi === 'yes',
      is_active: true, lat, lng,
    }).select().single()

    if (rest) {
      await supabase.from('deals').insert({
        restaurant_id: rest.id,
        special: vendor.special,
        price: parseFloat(vendor.price.replace('$', '')) || 0,
        days: vendor.days || ['Mon','Tue','Wed','Thu','Fri'],
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
      deal_days: deal?.days || ['Mon','Tue','Wed','Thu','Fri'],
      work_friendly: r.work_friendly || false,
      wifi: r.wifi || false,
    })
  }

  async function saveEdit(r: Restaurant) {
    setSaving(true)

    let finalPhotoUrl = editForm.photo_url || null
    let finalPhotoUrls = editForm.photo_urls || []

    // Upload new main photo if selected
    if (editMainFile) {
      const ext = editMainFile.name.split('.').pop()
      const filePath = `${r.id}-main-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('restaurant-photos').upload(filePath, editMainFile, { upsert: true })
      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message)
      } else {
        const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(filePath)
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
      work_friendly: editForm.work_friendly || false,
      wifi: editForm.wifi || false,
    }).eq('id', r.id)

    const deal = deals.find(d => d.restaurant_id === r.id)
    if (deal) {
      await supabase.from('deals').update({
        special: editForm.deal_special,
        price: parseFloat(editForm.deal_price || '0'),
        days: editForm.deal_days || ['Mon','Tue','Wed','Thu','Fri'],
      }).eq('id', deal.id)
    } else if (editForm.deal_special) {
      await supabase.from('deals').insert({
        restaurant_id: r.id,
        special: editForm.deal_special,
        price: parseFloat(editForm.deal_price || '0'),
        days: editForm.deal_days || ['Mon','Tue','Wed','Thu','Fri'],
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
          {((['pending', 'restaurants', 'reservations', 'add', 'users', 'contacts'] as const)).map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'pending' ? 'Pending submissions' : t === 'restaurants' ? 'Active listings' : t === 'reservations' ? 'Reservations' : t === 'add' ? '+ Add listing' : t === 'users' ? 'Users' : 'Contacts'}
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
                {editingVendorId === v.id ? (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <h4 className="font-medium text-gray-800">Review & Edit before approving</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Restaurant name</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.restaurant_name || ''} onChange={e => setVendorEditForm((f: any) => ({...f, restaurant_name: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.address || ''} onChange={e => setVendorEditForm((f: any) => ({...f, address: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Neighborhood</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.neighborhood || ''} onChange={e => setVendorEditForm((f: any) => ({...f, neighborhood: e.target.value}))}>
                          <option value="">Select...</option>
                          {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Cuisine</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.cuisine || ''} onChange={e => setVendorEditForm((f: any) => ({...f, cuisine: e.target.value}))}>
                          <option value="">Select...</option>
                          {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hours</label>
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.hours || ''} onChange={e => setVendorEditForm((f: any) => ({...f, hours: e.target.value}))}>
                          <option value="">Select...</option>
                          {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Price</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.price || ''} onChange={e => setVendorEditForm((f: any) => ({...f, price: e.target.value}))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Deal description</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.special || ''} onChange={e => setVendorEditForm((f: any) => ({...f, special: e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bio</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.bio || ''} onChange={e => setVendorEditForm((f: any) => ({...f, bio: e.target.value}))} maxLength={120} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Contact name</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.contact_name || ''} onChange={e => setVendorEditForm((f: any) => ({...f, contact_name: e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.email || ''} onChange={e => setVendorEditForm((f: any) => ({...f, email: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={vendorEditForm.phone || ''} onChange={e => setVendorEditForm((f: any) => ({...f, phone: e.target.value}))} />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={vendorEditForm.work_friendly === 'yes'} onChange={e => setVendorEditForm((f: any) => ({...f, work_friendly: e.target.checked ? 'yes' : 'no'}))} />
                        💻 Laptop friendly
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={vendorEditForm.wifi === 'yes'} onChange={e => setVendorEditForm((f: any) => ({...f, wifi: e.target.checked ? 'yes' : 'no'}))} />
                        📶 Free WiFi
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Days available</label>
                      <div className="flex gap-2 flex-wrap">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                          <label key={day} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${(vendorEditForm.days || []).includes(day) ? 'border-[#4A9FD5] bg-[#EEF6FC] text-[#4A9FD5]' : 'border-gray-200 text-gray-500'}`}>
                            <input type="checkbox" className="hidden" checked={(vendorEditForm.days || []).includes(day)}
                              onChange={e => {
                                const curr = vendorEditForm.days || [];
                                const next = e.target.checked ? [...curr, day] : curr.filter((d: string) => d !== day);
                                setVendorEditForm((f: any) => ({...f, days: next}));
                              }} />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <label className="block text-xs text-gray-500 mb-2">Photos (click to enlarge)</label>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {vendorEditForm.photo_url && (
                          <div className="relative">
                            <img src={vendorEditForm.photo_url} alt="Main" className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxUrl(vendorEditForm.photo_url)} />
                            <span className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-[10px] px-1 rounded">Main</span>
                          </div>
                        )}
                        {vendorEditForm.photo_urls?.map((url: string, i: number) => (
                          <img key={i} src={url} alt={`Extra ${i+1}`} className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxUrl(url)} />
                        ))}
                        {!vendorEditForm.photo_url && (!vendorEditForm.photo_urls || vendorEditForm.photo_urls.length === 0) && (
                          <p className="text-xs text-gray-400">No photos uploaded</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Replace main photo</label>
                          <input type="file" accept="image/*" onChange={e => setVendorMainFile(e.target.files?.[0] || null)} className="text-xs" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Replace extra photos</label>
                          <input type="file" accept="image/*" multiple onChange={e => setVendorExtraFiles(Array.from(e.target.files || []).slice(0, 3))} className="text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={async () => {
                        // Upload new photos if selected
                        let photoUrl = vendorEditForm.photo_url;
                        let photoUrls = vendorEditForm.photo_urls || [];
                        if (vendorMainFile) {
                          const ext = vendorMainFile.name.split('.').pop();
                          const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                          const { error } = await supabase.storage.from('restaurant-photos').upload(filePath, vendorMainFile, { upsert: true });
                          if (!error) {
                            const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(filePath);
                            photoUrl = urlData.publicUrl;
                          }
                        }
                        if (vendorExtraFiles.length > 0) {
                          const newUrls: string[] = [];
                          for (const file of vendorExtraFiles) {
                            const ext = file.name.split('.').pop();
                            const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                            const { error } = await supabase.storage.from('restaurant-photos').upload(filePath, file, { upsert: true });
                            if (!error) {
                              const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(filePath);
                              newUrls.push(urlData.publicUrl);
                            }
                          }
                          photoUrls = newUrls;
                        }
                        const updatedVendor = {...vendorEditForm, photo_url: photoUrl, photo_urls: photoUrls};
                        await supabase.from('vendors').update(updatedVendor).eq('id', v.id);
                        approveVendor({...v, ...updatedVendor});
                        setEditingVendorId(null);
                        setVendorMainFile(null);
                        setVendorExtraFiles([]);
                      }} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Save & Approve</button>
                      <button onClick={() => setEditingVendorId(null)} className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => { setEditingVendorId(v.id); setVendorEditForm({...v}); }} className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600">Review & Edit</button>
                    <button onClick={() => approveVendor(v)} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Quick Approve</button>
                    <button onClick={() => rejectVendor(v.id)} className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 text-sm font-medium hover:bg-red-200">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* RESTAURANTS TAB */}
        {tab === 'add' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add new restaurant listing</h2>
            {addError && <p className="text-red-500 text-sm mb-4">{addError}</p>}
            {addSuccess && <p className="text-green-600 text-sm mb-4">{addSuccess}</p>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant name *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Joe's Pizza" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))} placeholder="123 Main St, New York, NY" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood *</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.neighborhood} onChange={e => setAddForm(f => ({...f, neighborhood: e.target.value}))}>
                    <option value="">Select...</option>
                    {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine *</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.cuisine} onChange={e => setAddForm(f => ({...f, cuisine: e.target.value}))}>
                    <option value="">Select...</option>
                    {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.hours} onChange={e => setAddForm(f => ({...f, hours: e.target.value}))}>
                  <option value="">Select...</option>
                  {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">One-line bio</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.bio} onChange={e => setAddForm(f => ({...f, bio: e.target.value}))} placeholder="e.g. Upscale Italian in the heart of Midtown" maxLength={120} />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={addForm.work_friendly} onChange={e => setAddForm(f => ({...f, work_friendly: e.target.checked}))} />
                  💻 Laptop friendly
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={addForm.wifi} onChange={e => setAddForm(f => ({...f, wifi: e.target.checked}))} />
                  📶 Free WiFi
                </label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Lunch deal</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deal description *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.special} onChange={e => setAddForm(f => ({...f, special: e.target.value}))} placeholder="e.g. Pasta + salad + dessert" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.price} onChange={e => setAddForm(f => ({...f, price: e.target.value}))} placeholder="e.g. 29" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days available</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                      <label key={day} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${addForm.days.includes(day) ? 'border-[#4A9FD5] bg-[#EEF6FC] text-[#4A9FD5]' : 'border-gray-200 text-gray-500'}`}>
                        <input type="checkbox" className="hidden" checked={addForm.days.includes(day)}
                          onChange={e => {
                            const next = e.target.checked ? [...addForm.days, day] : addForm.days.filter(d => d !== day)
                            setAddForm(f => ({...f, days: next}))
                          }} />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Photos</h3>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Main photo</label>
                  <input type="file" accept="image/*" onChange={e => setAddMainFile(e.target.files?.[0] || null)} className="text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra photos (up to 3)</label>
                  <input type="file" accept="image/*" multiple onChange={e => setAddExtraFiles(Array.from(e.target.files || []).slice(0, 3))} className="text-sm" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Contact information</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact name *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.contact_name} onChange={e => setAddForm(f => ({...f, contact_name: e.target.value}))} placeholder="Owner or manager name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.contact_email} onChange={e => setAddForm(f => ({...f, contact_email: e.target.value}))} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={addForm.contact_phone} onChange={e => setAddForm(f => ({...f, contact_phone: e.target.value}))} placeholder="(212) 555-0100" />
                  </div>
                </div>
              </div>

              <button onClick={submitNewRestaurant} disabled={addSaving}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {addSaving ? 'Adding...' : 'Add restaurant & go live'}
              </button>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            {usersLoading ? (
              <p className="text-sm text-gray-400">Loading users...</p>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-[#4A9FD5]">{users.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Total signups</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {users.filter(u => {
                        const d = new Date(u.created_at)
                        const now = new Date()
                        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
                      }).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Joined this week</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {users.filter(u => u.neighborhood).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">With neighborhood</p>
                  </div>
                </div>

                {/* User list */}
                <div className="space-y-2">
                  {users.map(u => {
                    const joined = new Date(u.created_at)
                    const dateStr = joined.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    const timeStr = joined.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    return (
                      <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{u.name || '—'}</p>
                          <p className="text-xs text-gray-500">{u.email || '—'}</p>
                          <p className="text-xs text-gray-400">{u.neighborhood || 'No neighborhood'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{dateStr}</p>
                          <p className="text-xs text-gray-400">{timeStr}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'contacts' && (
          <div>
            {contactsLoading ? (
              <p className="text-sm text-gray-400">Loading contacts...</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-[#4A9FD5]">{allVendorContacts.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Total submissions</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{allVendorContacts.filter(v => v.status === 'approved').length}</p>
                    <p className="text-xs text-gray-500 mt-1">Approved</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{allVendorContacts.filter(v => v.status === 'pending').length}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {allVendorContacts.map(v => {
                    const dateStr = new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    return (
                      <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{v.restaurant_name}</p>
                            <p className="text-xs text-gray-500">{v.neighborhood} · {v.cuisine}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            v.status === 'approved' ? 'bg-green-100 text-green-700' :
                            v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>{v.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="text-gray-400 text-xs">Contact name</span>
                            <p>{v.contact_name || '—'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Email</span>
                            <p><a href={"mailto:" + v.email} className="text-[#4A9FD5] hover:underline">{v.email || '—'}</a></p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Phone</span>
                            <p><a href={"tel:" + v.phone} className="text-[#4A9FD5] hover:underline">{v.phone || '—'}</a></p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Submitted</span>
                            <p>{dateStr}</p>
                          </div>
                        </div>
                        {v.message && (
                          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                            <span className="text-gray-400 text-xs block mb-1">Message</span>
                            {v.message}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          {v.special && <span>Deal: {v.special} · </span>}
                          {v.price && <span>${v.price} · </span>}
                          {v.hours && <span>{v.hours}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'reservations' && (
          <div>
            {/* Today / All toggle */}
            <div className="flex gap-2 mb-6">
              {['today', 'all'].map(v => (
                <button key={v} onClick={() => setResView(v as any)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${resView === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {v === 'today' ? "Today's bookings" : "All time"}
                </button>
              ))}
            </div>

            {resLoading ? (
              <p className="text-sm text-gray-400">Loading reservations...</p>
            ) : (
              <ReservationsView reservations={reservations} resView={resView} />
            )}
          </div>
        )}

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
                            <option value="">Select cuisine...</option>
                            {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                            {CUISINES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Neighborhood</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.neighborhood || ''} onChange={e => setEditForm(f => ({ ...f, neighborhood: e.target.value }))}>
                            <option value="">Select neighborhood...</option>
                            {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                            {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hours</label>
                          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editForm.hours || ''} onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}>
                            <option value="">Select hours...</option>
                            {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
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
                        <div className="flex gap-4 mt-3">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={!!editForm.work_friendly} onChange={e => setEditForm(f => ({ ...f, work_friendly: e.target.checked }))} />
                            💻 Laptop friendly
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={!!editForm.wifi} onChange={e => setEditForm(f => ({ ...f, wifi: e.target.checked }))} />
                            📶 Free WiFi
                          </label>
                        </div>
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
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-2">Days available</p>
                              <div className="flex gap-2 flex-wrap">
                                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                                  <label key={day} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${(editForm.deal_days || []).includes(day) ? 'border-[#4A9FD5] bg-[#EEF6FC] text-[#4A9FD5]' : 'border-gray-200 text-gray-500'}`}>
                                    <input type="checkbox" className="hidden" checked={(editForm.deal_days || []).includes(day)}
                                      onChange={e => {
                                        const curr = editForm.deal_days || [];
                                        const next = e.target.checked ? [...curr, day] : curr.filter((d: string) => d !== day);
                                        setEditForm(f => ({ ...f, deal_days: next }));
                                      }} />
                                    {day}
                                  </label>
                                ))}
                              </div>
                            </div>
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
                      <div><span className="text-gray-400">Days</span><br />{
                        deal?.days && deal.days.length > 0
                          ? deal.days.length === 7 ? 'Daily'
                          : (deal.days.length === 5 && !deal.days.includes('Sat') && !deal.days.includes('Sun')) ? 'Mon–Fri'
                          : deal.days.join(', ')
                          : 'Mon–Fri'
                      }</div>
                      <div><span className="text-gray-400">Price</span><br />{deal?.price ? `$${deal.price}` : '—'}</div>
                      <div><span className="text-gray-400">Bio</span><br />{r.bio || <span className="text-gray-300">None</span>}</div>
                      <div><span className="text-gray-400">Lat/lng</span><br />{r.lat && r.lng ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : <span className="text-amber-600">Missing — won't show on map</span>}</div>
                      {(() => {
                        const v = vendors.find(v => v.restaurant_name === r.name);
                        return v ? (
                          <>
                            <div><span className="text-gray-400">Contact</span><br />{v.contact_name || '—'}</div>
                            <div><span className="text-gray-400">Email</span><br /><a href={`mailto:${v.email}`} className="text-[#4A9FD5] hover:underline">{v.email || '—'}</a></div>
                            <div><span className="text-gray-400">Phone</span><br /><a href={`tel:${v.phone}`} className="text-[#4A9FD5] hover:underline">{v.phone || '—'}</a></div>
                          </>
                        ) : null;
                      })()}
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
