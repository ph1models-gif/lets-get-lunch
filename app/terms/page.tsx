{/* Boilerplate drafted for Google OAuth verification; not lawyer-reviewed. Have counsel review before scaling. */}
export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: May 26, 2026</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-gray-700 text-base leading-relaxed space-y-5">
          <p>Welcome to Let&apos;s Get Lunch. By using letsgetlunch.nyc you agree to these terms. The service is a directory of New York City prix-fixe lunch deals and a reservation-request tool, provided for informational and convenience purposes.</p>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Reservations</h2>
            <p>For most listings, requesting a reservation notifies the restaurant or directs you to call or visit them. Let&apos;s Get Lunch does not guarantee a table, specific pricing, availability, or that any particular lunch deal will be honored. Those decisions rest with each individual restaurant.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Listing accuracy</h2>
            <p>We work to keep listings accurate, but deals, hours, and prices may change without notice and are controlled by the restaurants. We are not responsible for restaurant-side changes or for any difference between a listing and your actual experience.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Acceptable use</h2>
            <p>Please use the service fairly. Do not scrape, abuse, disrupt, or misuse the site, attempt to access other users&apos; accounts, or use the service for any unlawful purpose.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Accounts</h2>
            <p>You are responsible for activity under your account. We may suspend or remove accounts that violate these terms or abuse the service.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Disclaimer and liability</h2>
            <p>The service is provided &quot;as is,&quot; without warranties of any kind. To the fullest extent permitted by law, Let&apos;s Get Lunch is not liable for any indirect or consequential damages arising from your use of the service or from your interactions with listed restaurants.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact</h2>
            <p>Questions about these terms? Email <a href="mailto:brian@letsgetlunch.nyc" className="text-[#4A9FD5] hover:underline">brian@letsgetlunch.nyc</a>.</p>
          </div>
        </div>
        <p className="text-center mt-6"><a href="/" className="text-sm text-[#4A9FD5] hover:underline">&larr; Back to lunch deals</a></p>
      </div>
    </main>
  );
}
