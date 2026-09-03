{/* Boilerplate drafted for Google/Apple OAuth verification and App Store review; not lawyer-reviewed. Have counsel review before scaling. */}
export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#EEF6FC] px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <a href="/">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">&#127869;&#65039;</span>
              <span className="text-2xl font-bold text-gray-900">Let&apos;s Get Lunch</span>
            </div>
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: September 3, 2026</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-gray-700 text-base leading-relaxed space-y-5">
          <p>Let&apos;s Get Lunch NYC LLC, a New York limited liability company (&quot;we,&quot; &quot;us&quot;), operates letsgetlunch.nyc and the Let&apos;s Get Lunch iOS app, a directory of New York City prix-fixe lunch specials where you can browse listings, make reservation requests, and claim exclusive deals. This policy explains what we collect and how we use it, on the website and in the app alike.</p>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What we collect</h2>
            <p>When you create an account, we collect your name, email address, and optionally the neighborhood where you typically eat lunch. If you sign in with Google or Apple, we receive your name and email address from that provider — if you choose Apple&apos;s &quot;Hide My Email&quot; option, we receive a private relay address instead of your real one, which still works normally for account and email purposes. When you make a reservation request, we collect the details of that request, such as the restaurant, date, and party size. When you claim an exclusive deal, we generate a redemption code tied to your account and that deal, which you present at the restaurant. If you use the map&apos;s &quot;near me&quot; feature or grant the app location permission, we use your device&apos;s location in the moment to show nearby specials — we don&apos;t store a history of your location. If you enable push notifications in the app, we tag your device with your account ID so we can send you relevant notifications.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How we use it</h2>
            <p>We use your information to provide the service, send you reservation confirmations and related emails, personalize listings to your area, and improve the product. We do not sell your personal data.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Service providers</h2>
            <p>We rely on a small number of trusted providers to operate the service, and share data with them only for that purpose: Supabase (authentication and database), Resend (transactional email), Vercel (hosting), Google and Apple (optional sign-in), and OneSignal (push notifications in the iOS app).</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h2>
            <p>We use Vercel Web Analytics, a privacy-friendly analytics service provided by our hosting partner, to understand how many people visit the site and which pages they view. This service does not use cookies, does not identify individual users, and does not track you across other websites. It collects aggregated data such as page views, referring sites, country, and device type.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your choices</h2>
            <p>You can delete your account at any time from Account Settings in the app or on the website (tap your name in the top right, then Account Settings). This permanently deletes your profile and sign-in. Any exclusive deal codes you&apos;ve claimed or reservation requests you&apos;ve made stay on record — our restaurant partners rely on that redemption history — but we remove your name and email from them so they can no longer be traced back to you. You can also request access to, correction of, or deletion of your personal data at any time by emailing us, and we will respond within a reasonable time. You can turn off push notifications at any time in your device&apos;s Settings, and you can revoke location access at any time in your browser or device settings.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>Questions? Email <a href="mailto:brian@letsgetlunch.nyc" className="text-[#4A9FD5] hover:underline">brian@letsgetlunch.nyc</a>.</p>
          </div>
        </div>
        <p className="text-center mt-6"><a href="/" className="text-sm text-[#4A9FD5] hover:underline">&larr; Back to lunch specials</a></p>
      </div>
    </main>
  );
}
