import { marked } from 'marked'

const BASE = 'https://www.letsgetlunch.nyc'

export type AnnouncementPost = {
  title: string
  slug: string
  body: string
  cover_image_url: string | null
}

export type AnnouncementEmailRecipient = {
  email: string
  email_pref_token: string
}

export function announcementEmailSubject(post: AnnouncementPost): string {
  return `New from Let's Get Lunch: ${post.title}`
}

// Cover image goes through the same Next.js image optimizer the site itself
// uses (next.config.js deviceSizes) rather than sending the original file —
// 640 is the smallest configured bucket, tuned for exactly this "small and
// fast on mobile" case. Next negotiates format off the request's Accept
// header; email clients typically don't claim WebP support, so this falls
// back to serving the original format unmodified, just resized/compressed —
// which is also the safer choice for older email client compatibility.
function optimizedCoverImageUrl(coverImageUrl: string): string {
  return `${BASE}/_next/image?url=${encodeURIComponent(coverImageUrl)}&w=640&q=70`
}

export function announcementEmailHtml(post: AnnouncementPost, recipient: AnnouncementEmailRecipient): string {
  const postUrl = `${BASE}/newsletter/${post.slug}`
  const bodyHtml = marked.parse(post.body || '', { async: false }) as string
  const coverImg = post.cover_image_url ? optimizedCoverImageUrl(post.cover_image_url) : null

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <style>
        .post-body h1, .post-body h2, .post-body h3 { font-family:sans-serif; color:#111; margin:24px 0 8px; }
        .post-body p { font-family:sans-serif; color:#444; font-size:16px; line-height:1.6; margin:0 0 16px; }
        .post-body a { color:#4A9FD5; }
        .post-body img { max-width:100%; height:auto; border-radius:8px; }
        .post-body ul, .post-body ol { font-family:sans-serif; color:#444; font-size:16px; line-height:1.6; padding-left:20px; margin:0 0 16px; }
        .post-body blockquote { border-left:3px solid #4A9FD5; margin:0 0 16px; padding-left:16px; color:#666; }
      </style>
      <h1 style="color:#4A9FD5;font-size:26px;margin-bottom:16px">${post.title}</h1>
      ${coverImg ? `<img src="${coverImg}" alt="" width="600" style="width:100%;max-width:600px;height:auto;border-radius:12px;margin-bottom:20px;display:block" />` : ''}
      <div class="post-body">${bodyHtml}</div>
      <div style="text-align:center;margin:32px 0 24px">
        <a href="${postUrl}" style="display:inline-block;background:#4A9FD5;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:8px;padding:10px 20px">View this post online</a>
      </div>
      <p style="color:#888;font-size:13px">- The Let's Get Lunch team</p>
      <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
        Let's Get Lunch - New York, NY<br/>
        <a href="${BASE}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="${BASE}/email-preferences?token=${recipient.email_pref_token}" style="color:#bbb;text-decoration:underline">Email preferences</a>
      </p>
    </div>
  `
}
