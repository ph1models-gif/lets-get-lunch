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
  announcement_sent_at: string | null
  announcement_recipient_count: number | null
}

type AnnounceState = {
  status: 'idle' | 'confirming' | 'sending'
  count?: number
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

// Appends a numeric suffix if `base` collides with another post's slug.
function uniqueSlug(base: string, posts: Post[], excludeId: string | null): string {
  if (!base) return base
  const taken = new Set(posts.filter(p => p.id !== excludeId).map(p => p.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export default function NewsletterPanel({ pw }: { pw: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [slugTouched, setSlugTouched] = useState(false)
  // published_at of the post currently loaded into the form, if it's ever been
  // published — set once and kept forever by posts-update, so this survives
  // toggling the "Published" checkbox back off within the same edit.
  const [editingPublishedAt, setEditingPublishedAt] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [announceState, setAnnounceState] = useState<Record<string, AnnounceState>>({})
  const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})

  useEffect(() => {
    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setEditingPublishedAt(null)
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
    setEditingPublishedAt(post.published_at)
    // If the stored slug doesn't match a fresh auto-generation from the current
    // title, it's been manually customized — leave it alone on further title
    // edits. Otherwise keep tracking the title (draft posts only; published
    // posts are locked outright regardless of this, see slugLocked below).
    setSlugTouched(post.slug !== slugify(post.title))
    setCoverFile(null)
    setCoverPreview(post.cover_image_url)
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Once a post has ever been published (published_at persists even if later
  // unpublished) or is about to be published in this save, its slug is the
  // live/indexed/emailed URL — lock it so a title edit can't silently change it.
  const slugLocked = !!editingPublishedAt || form.published

  function handleTitleChange(value: string) {
    if (slugLocked) {
      setForm(f => ({ ...f, title: value }))
      return
    }
    setForm(f => ({
      ...f,
      title: value,
      slug: slugTouched ? f.slug : uniqueSlug(slugify(value), posts, f.id),
    }))
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

  async function sendTest(id: string) {
    setTestState(s => ({ ...s, [id]: 'sending' }))
    const res = await fetch('/api/admin/posts-send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      alert(data.error || 'Could not send test.')
      setTestState(s => ({ ...s, [id]: 'idle' }))
      return
    }
    setTestState(s => ({ ...s, [id]: 'sent' }))
    setTimeout(() => setTestState(s => ({ ...s, [id]: 'idle' })), 3000)
  }

  async function startAnnounce(id: string) {
    const res = await fetch('/api/admin/posts-announcement-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      alert(data.error || 'Could not load recipient count.')
      return
    }
    setAnnounceState(s => ({ ...s, [id]: { status: 'confirming', count: data.count } }))
  }

  function cancelAnnounce(id: string) {
    setAnnounceState(s => ({ ...s, [id]: { status: 'idle' } }))
  }

  async function sendAnnounce(id: string) {
    setAnnounceState(s => ({ ...s, [id]: { ...s[id], status: 'sending' } }))
    const res = await fetch('/api/admin/posts-send-announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      alert(data.error || 'Could not send announcement.')
      setAnnounceState(s => ({ ...s, [id]: { status: 'idle' } }))
      return
    }
    setAnnounceState(s => ({ ...s, [id]: { status: 'idle' } }))
    fetchPosts()
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-end mb-4">
        <a href="/newsletter" className="text-sm text-orange-500 hover:underline">View newsletter →</a>
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
            <input type="text" value={form.slug} disabled={slugLocked}
              onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">
              /newsletter/{form.slug || 'your-slug'}
              {slugLocked && <span className="text-amber-600"> · Locked — this post has been published</span>}
            </p>
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
            {posts.map(post => {
              const announce = announceState[post.id] || { status: 'idle' as const }
              return (
              <div key={post.id} className="border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
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

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => sendTest(post.id)} disabled={testState[post.id] === 'sending'}
                    className="text-sm text-gray-500 hover:underline disabled:opacity-50">
                    {testState[post.id] === 'sending' ? 'Sending test...' : testState[post.id] === 'sent' ? 'Test sent' : 'Send test to me'}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  {announce.status === 'confirming' ? (
                    <>
                      <p className="text-sm text-gray-700">Send to {announce.count} recipient{announce.count === 1 ? '' : 's'}?</p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button onClick={() => sendAnnounce(post.id)} className="text-sm text-blue-600 hover:underline font-medium">
                          Confirm
                        </button>
                        <button onClick={() => cancelAnnounce(post.id)} className="text-sm text-gray-500 hover:underline">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : post.announcement_sent_at ? (
                    <>
                      <p className="text-xs text-gray-400">
                        Sent on {new Date(post.announcement_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {typeof post.announcement_recipient_count === 'number' ? ` · ${post.announcement_recipient_count} recipients` : ''}
                      </p>
                      <button onClick={() => startAnnounce(post.id)} disabled={announce.status === 'sending'}
                        className="text-sm text-orange-500 hover:underline disabled:opacity-50">
                        {announce.status === 'sending' ? 'Sending...' : 'Resend'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span />
                      <button onClick={() => startAnnounce(post.id)} disabled={!post.published || announce.status === 'sending'}
                        title={!post.published ? 'Publish the post first' : undefined}
                        className="text-sm text-orange-500 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                        {announce.status === 'sending' ? 'Sending...' : 'Send as announcement'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
