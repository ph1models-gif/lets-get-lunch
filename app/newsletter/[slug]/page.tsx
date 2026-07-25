import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { supabase } from '../../../lib/supabase';

const BASE = 'https://www.letsgetlunch.nyc';

export const dynamic = 'force-dynamic';

interface Post {
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

async function getPost(slug: string): Promise<Post | null> {
  const { data } = await supabase
    .from('posts')
    .select('title, excerpt, body, cover_image_url, published_at, created_at')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  return data;
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: "Post not found | Let's Get Lunch" };
  }

  const canonical = `${BASE}/newsletter/${params.slug}`;
  const title = `${post.title} | Let's Get Lunch`;
  const description = post.excerpt || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Let's Get Lunch",
      type: 'article',
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function NewsletterPost(
  { params }: { params: { slug: string } }
) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const html = marked.parse(post.body, { async: false }) as string;

  return (
    <main className="min-h-screen bg-[#EEF6FC] px-4 pt-10 pb-16">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <a href="/"><img src="/logo.jpg" alt="Let's Get Lunch" className="h-24 w-auto rounded-2xl inline-block" /></a>
        </div>

        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-6 sm:p-8">
            <p className="text-xs text-gray-400 mb-1">
              {formatDate(post.published_at || post.created_at)}
            </p>
            <h1 className="font-[family-name:var(--font-bebas)] tracking-wide text-3xl text-gray-900">{post.title}</h1>
            <div
              className="prose prose-sm sm:prose-base max-w-none mt-6 prose-headings:font-[family-name:var(--font-bebas)] prose-headings:tracking-wide prose-headings:text-gray-900 prose-a:text-[#4A9FD5]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </article>

        <p className="text-center mt-8">
          <a href="/newsletter" className="text-sm text-[#4A9FD5] hover:underline">← Back to newsletter</a>
        </p>
      </div>
    </main>
  );
}
