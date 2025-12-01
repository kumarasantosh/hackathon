export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">
              UNIVO<span className="text-purple-600">+</span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Connect with verified toppers for affordable tutoring and find
              study groups that match your learning pace.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-black mb-4 text-sm">Platform</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <a
                  href="/batch5"
                  className="hover:text-black transition-colors"
                >
                  Batch 5 Dt Project
                </a>
              </li>
              <li>
                <a
                  href="/resources"
                  className="hover:text-black transition-colors"
                >
                  Resources
                </a>
              </li>
              <li>
                <a
                  href="/toppers"
                  className="hover:text-black transition-colors"
                >
                  Toppers
                </a>
              </li>
              <li>
                <a
                  href="/groups"
                  className="hover:text-black transition-colors"
                >
                  Study Groups
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-black mb-4 text-sm">
              For Toppers
            </h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <a
                  href="/topper/verify"
                  className="hover:text-black transition-colors"
                >
                  Become a Topper
                </a>
              </li>
              <li>
                <a
                  href="/resources/upload"
                  className="hover:text-black transition-colors"
                >
                  Upload Resources
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-black mb-4 text-sm">Support</h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <a href="/about" className="hover:text-black transition-colors">
                  About
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="hover:text-black transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a href="/help" className="hover:text-black transition-colors">
                  Help
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; 2024 UNIVO+. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
