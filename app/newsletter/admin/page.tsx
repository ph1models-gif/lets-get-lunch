import { redirect } from 'next/navigation'

// Newsletter admin moved onto the main admin dashboard as a tab, so old
// bookmarks to this URL land there instead of a dead page.
export default function NewsletterAdminRedirect() {
  redirect('/admin?tab=newsletter')
}
