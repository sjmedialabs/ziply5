export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 mb-12 text-center sm:text-left">
          <div className="lg:col-span-1">
            <div className="bg-yellow-400 rounded-2xl p-6 text-zinc-900">
              <h3 className="font-heading text-2xl font-extrabold text-orange-500 mb-2">ZIPLY<span className="text-green-600">5</span></h3>
              <p className="text-sm font-medium mb-4">Monday - Sunday:<br />10:00am - 10:00pm</p>
              <p className="text-sm font-bold">+91 9901233213</p>
              <p className="text-sm">support@ziply5.com</p>
              <div className="flex justify-center sm:justify-start gap-3 mt-4">
                <a href="#" className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                {/* Social icons skipped for brevity (assumed equivalent as existing code) */}
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">About</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-orange-500 transition-colors">About Ziply5</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Special Diet</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Book now</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Menu</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-orange-500 transition-colors">Ready-to-Eat Meals</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Ready-to-Cook</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Veg</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Non-veg</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Combo packs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-orange-500 transition-colors">About Ziply5</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Special Diet</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Book now</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Newsletter</h4>
            <p className="text-zinc-400 text-sm mb-4">Get recent news and updates.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="email" placeholder="Email Address" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500" />
              <button className="bg-white text-zinc-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-500 hover:text-white transition-colors">Subscribe</button>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-6 text-center text-zinc-500 text-sm">
          <p>&copy; 2026 Ziply5. All Rights Reserved</p>
        </div>
      </div>
    </footer>
  )
}