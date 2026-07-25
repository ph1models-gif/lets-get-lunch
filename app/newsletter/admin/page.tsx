'use client'

import { useState, useEffect } from 'react'

type Post = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  published: boolean
  published_at: string | null
  created_at: string
}

const EMPTY_FORM = {
  id: null as string | null,
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover_image_url: '' as string | null,
  published: false,
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function NewsletterAdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [slugTouched, setSlugTouched] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (authed) fetchPosts()
  }, [authed])

  async function doLogin() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) setAuthed(true)
    else alert('Wrong password')
  }

  async function fetchPosts() {
    setPostsLoading(true)
    const res = await fetch('/api/admin/posts-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    const data = await res.json().catch(() => ({}))
    setPosts(res.ok && data.ok ? (data.posts || []) : [])
    setPostsLoading(false)
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM })
    setSlugTouched(false)
    setCoverFile(null)
    setCoverPreview(null)
    setFormError('')
  }

  function startEdit(post: Post) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      body: post.body || '',
      cover_image_url: post.cover_image_url,
      published: post.published,
    })
    setSlugTouched(true)
    setCoverFile(null)
    setCoverPreview(post.cover_image_url)
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTitleChange(value: string) {
    setForm(f => ({ ...f, title: value, slug: slugTouched ? f.slug : slugify(value) }))
  }

  function handleCoverFile(file: File | null) {
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : form.cover_image_url)
  }

  async function savePost() {
    if (!form.title.trim() || !form.slug.trim()) {
      setFormError('Title and slug are required.')
      return
    }
    setSaving(true)
    setFormError('')

    let coverUrl = form.cover_image_url
    if (coverFile) {
      const fd = new FormData()
      fd.append('password', pw)
      fd.append('file', coverFile)
      const uploadRes = await fetch('/api/admin/posts-upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || !uploadData.ok) {
        setFormError(uploadData.error || 'Cover image upload failed.')
        setSaving(false)
        return
      }
      coverUrl = uploadData.url
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      body: form.body,
      cover_image_url: coverUrl,
      published: form.published,
    }

    const res = await fetch(form.id ? '/api/admin/posts-update' : '/api/admin/posts-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.id ? { password: pw, id: form.id, post: payload } : { password: pw, post: payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      setFormError(data.error || 'Could not save post.')
      setSaving(false)
      return
    }

    setSaving(false)
    resetForm()
    fetchPosts()
  }

  async function deletePost(id: string) {
    await fetch('/api/admin/posts-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, id }),
    })
    setConfirmDeleteId(null)
    if (form.id === id) resetForm()
    fetchPosts()
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin login</h1>
          <input type="password" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doLogin() }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={doLogin}
            className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600">
            Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Newsletter admin</h1>
          <div className="flex items-center gap-3">
            <a href="/newsletter" className="text-sm text-orange-500 hover:underline">View newsletter</a>
            <a href="/admin" className="text-sm text-orange-500 hover:underline">← Main admin</a>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {form.id ? 'Edit post' : 'New post'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input type="text" value={form.slug}
                onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <p className="text-xs text-gray-400 mt-1">/newsletter/{form.slug || 'your-slug'}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Excerpt</label>
              <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Body (Markdown)</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cover image</label>
              {coverPreview && (
                <img src={coverPreview} alt="" className="w-full h-40 object-cover rounded-lg mb-2" />
              )}
              <input type="file" accept="image/*"
                onChange={e => handleCoverFile(e.target.files?.[0] || null)}
                className="text-sm" />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.published}
                onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
              Published
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={savePost} disabled={saving}
                className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                {saving ? 'Saving...' : form.id ? 'Save changes' : 'Create post'}
              </button>
              {form.id && (
                <button onClick={resetForm} className="text-sm text-gray-500 hover:underline">
                  Cancel edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All posts</h2>
          {postsLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-gray-400">No posts yet.</p>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className={post.published ? 'text-green-600' : 'text-gray-400'}>
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                      {' · '}
                      {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => startEdit(post)} className="text-sm text-orange-500 hover:underline">
                      Edit
                    </button>
                    {confirmDeleteId === post.id ? (
                      <>
                        <button onClick={() => deletePost(post.id)} className="text-sm text-red-600 hover:underline">
                          Confirm delete
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-gray-500 hover:underline">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(post.id)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
