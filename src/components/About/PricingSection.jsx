"use client";

export default function PricingSection() {
  return (
    <section className="py-20 px-20 bg-[#101010]">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          Pricing <span className="text-green-500">Options</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Transparent pricing for all your mining needs
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a1a] rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Hosting Services</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Basic Hosting</span>
                  <span className="text-green-500 font-bold">$0.06/kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Premium Hosting</span>
                  <span className="text-green-500 font-bold">$0.04/kWh</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Additional Services</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Setup Fee</span>
                  <span className="text-green-500 font-bold">$50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Maintenance</span>
                  <span className="text-green-500 font-bold">Included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

