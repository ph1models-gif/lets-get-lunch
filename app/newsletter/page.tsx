import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// A page-local client whose fetch always opts out of Next's Data Cache, so a
// deleted/edited post is reflected immediately instead of on the next
// automatic revalidation.
function getSupabase() {
  return createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4',
    { global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } }
  );
}

export const metadata: Metadata = {
  title: "Newsletter — Let's Get Lunch",
  description: "NYC lunch news, new prix-fixe deals, and neighborhood picks from Let's Get Lunch.",
};

interface Post {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function NewsletterArchive() {
  const { data: posts } = await getSupabase()
    .from('posts')
    .select('slug, title, excerpt, cover_image_url, published_at, created_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  return (
    <main className="min-h-screen bg-[#EEF6FC] px-4 pt-10 pb-16">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <a href="/"><img src="/logo.jpg" alt="Let's Get Lunch" className="h-24 w-auto rounded-2xl inline-block" /></a>
          <h1 className="font-[family-name:var(--font-bebas)] tracking-wide text-3xl text-gray-800 mt-4">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-1">NYC lunch news, new deals, and neighborhood picks.</p>
        </div>

        {!posts || posts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No posts yet — check back soon.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post: Post) => (
              <a
                key={post.slug}
                href={`/newsletter/${post.slug}`}
                className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <p className="text-xs text-gray-400 mb-1">
                    {formatDate(post.published_at || post.created_at)}
                  </p>
                  <h2 className="font-[family-name:var(--font-bebas)] tracking-wide text-2xl text-gray-900">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 mt-2">{post.excerpt}</p>
                  )}
                  <span className="inline-block text-sm text-[#4A9FD5] mt-3 font-medium">Read more →</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <p className="text-center mt-8">
          <a href="/" className="text-sm text-[#4A9FD5] hover:underline">← Back to lunch deals</a>
        </p>
      </div>
    </main>
  );
}
