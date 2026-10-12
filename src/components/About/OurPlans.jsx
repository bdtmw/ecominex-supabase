"use client";

export default function OurPlans() {
  return (
    <section className="py-20 px-20 bg-[#111]">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          Our <span className="text-green-500">Plans</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose the perfect plan for your mining needs
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-4">Basic</h3>
          <p className="text-gray-400 mb-6">Perfect for beginners</p>
          <div className="text-4xl font-bold text-green-500 mb-6">$99<span className="text-lg text-gray-400">/month</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Basic hosting
            </li>
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> 24/7 support
            </li>
          </ul>
          <button className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
            Get Started
          </button>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 border-2 border-green-500 transform scale-105">
          <h3 className="text-2xl font-bold text-white mb-4">Pro</h3>
          <p className="text-gray-400 mb-6">For serious miners</p>
          <div className="text-4xl font-bold text-green-500 mb-6">$299<span className="text-lg text-gray-400">/month</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Advanced hosting
            </li>
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Priority support
            </li>
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Enhanced features
            </li>
          </ul>
          <button className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
            Get Started
          </button>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-4">Enterprise</h3>
          <p className="text-gray-400 mb-6">For large operations</p>
          <div className="text-4xl font-bold text-green-500 mb-6">$999<span className="text-lg text-gray-400">/month</span></div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Premium hosting
            </li>
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Dedicated support
            </li>
            <li className="flex items-center text-gray-300">
              <span className="text-green-500 mr-2">✓</span> Custom solutions
            </li>
          </ul>
          <button className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition">
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}

