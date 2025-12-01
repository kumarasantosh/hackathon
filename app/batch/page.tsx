export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 md:px-12 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-20 animate-fade-in">
          <div className="inline-block px-4 py-2 bg-black text-white rounded-full mb-6">
            <span className="text-sm font-semibold">Our Team</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight text-gray-900">
            About Us
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl leading-relaxed">
            We are a passionate and multidisciplinary team of engineering
            students dedicated to creating innovative, user-friendly, and
            impactful technical solutions. Our combined knowledge from various
            branches enables us to design efficient and meaningful projects that
            solve real-world problems.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* ECE */}
          <div className="group relative bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-2xl transition-all duration-500 animate-slide-up overflow-hidden">
            <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900">
                Electronics & Communication
              </h3>
              <p className="text-sm text-purple-600 font-semibold mb-8">ECE</p>
              <div className="space-y-5">
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A0410</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-purple-600 transition-colors">
                    B. Greeshma Sri
                  </p>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A0435</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-purple-600 transition-colors">
                    M. Snehitha
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* IT */}
          <div className="group relative bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-pink-500 hover:shadow-2xl transition-all duration-500 animate-slide-up-delay-1 overflow-hidden">
            <div className="absolute inset-0 bg-pink-500/0 group-hover:bg-pink-500/5 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900">
                Information Technology
              </h3>
              <p className="text-sm text-pink-600 font-semibold mb-8">IT</p>
              <div className="space-y-5">
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A1265</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-pink-600 transition-colors">
                    V. Nuthan
                  </p>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A1252</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-pink-600 transition-colors">
                    P. Santosh
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CSE */}
          <div className="group relative bg-white p-8 rounded-3xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all duration-500 animate-slide-up-delay-2 overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900">
                Computer Science Engineering
              </h3>
              <p className="text-sm text-blue-600 font-semibold mb-8">CSE</p>
              <div className="space-y-5">
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A0523</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-blue-600 transition-colors">
                    Divya T
                  </p>
                </div>
                <div className="h-px bg-gray-200"></div>
                <div className="group/item">
                  <p className="text-xs text-gray-500 mb-1">24071A0535</p>
                  <p className="text-lg font-bold text-gray-900 group-hover/item:text-blue-600 transition-colors">
                    Kavuri Sai Sri Tripad
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.7s ease-out;
        }
        .animate-slide-up-delay-1 {
          animation: slideUp 0.7s ease-out 0.15s backwards;
        }
        .animate-slide-up-delay-2 {
          animation: slideUp 0.7s ease-out 0.3s backwards;
        }
      `}</style>
    </div>
  );
}
