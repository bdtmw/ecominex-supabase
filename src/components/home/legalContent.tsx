const legalContent = {
    "Privacy Policy": (
      <div className="space-y-6 text-gray-100">
        <div className="border-b border-gray-700 pb-4">
          <h3 className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-2xl font-bold text-transparent">
            Privacy Policy
          </h3>
          <p className="mt-2 text-sm text-gray-400">Last updated: January 15, 2025</p>
        </div>
  
        <div className="space-y-6">
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">1. Information We Collect</h4>
            <p className="mb-4 text-gray-300">We collect information that you provide directly to us, including:</p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                <span>Name and contact information</span>
              </li>
              <li className="flex items-center">
                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                <span>Account credentials</span>
              </li>
              <li className="flex items-center">
                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                <span>Payment information</span>
              </li>
              <li className="flex items-center">
                <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                <span>Communication preferences</span>
              </li>
            </ul>
          </section>
  
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">2. How We Use Your Information</h4>
            <div className="space-y-4 text-gray-300">
              <p>
                We use the information we collect to provide, maintain, and improve our services.
                Our primary goals are:
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                <li className="rounded-md bg-gray-700/50 p-3">
                  <span className="font-medium text-green-400">Service Improvement</span>
                  <p className="mt-1 text-sm">Enhancing your experience through data-driven insights</p>
                </li>
                <li className="rounded-md bg-gray-700/50 p-3">
                  <span className="font-medium text-green-400">Security</span>
                  <p className="mt-1 text-sm">Protecting your data and preventing unauthorized access</p>
                </li>
                <li className="rounded-md bg-gray-700/50 p-3">
                  <span className="font-medium text-green-400">Communication</span>
                  <p className="mt-1 text-sm">Keeping you informed about our services and updates</p>
                </li>
                <li className="rounded-md bg-gray-700/50 p-3">
                  <span className="font-medium text-green-400">Support</span>
                  <p className="mt-1 text-sm">Providing assistance and responding to your inquiries</p>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    ),
  
    "Terms of Service": (
      <div className="space-y-6 text-gray-100">
        <div className="border-b border-gray-700 pb-4">
          <h3 className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-2xl font-bold text-transparent">
            Terms of Service
          </h3>
          <p className="mt-2 text-sm text-gray-400">Effective Date: January 15, 2025</p>
        </div>
  
        <div className="space-y-6">
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">1. Acceptance of Terms</h4>
            <div className="space-y-4">
              <div className="rounded-md bg-gray-700/50 p-4 text-gray-300">
                <p>
                  By accessing and using EcomineX  services, you agree to be bound by these Terms of Service
                  and all applicable laws and regulations.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md bg-green-500/10 p-4">
                  <h5 className="mb-2 font-medium text-green-400">What You Accept</h5>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• All terms and conditions stated herein</li>
                    <li>• Our privacy policy and guidelines</li>
                    <li>• Future updates to these terms</li>
                  </ul>
                </div>
                <div className="rounded-md bg-green-500/10 p-4">
                  <h5 className="mb-2 font-medium text-green-400">Your Rights</h5>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Access to our services</li>
                    <li>• Protection of your data</li>
                    <li>• Right to terminate service</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
  
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">2. User Responsibilities</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Account Security",
                  items: ["Protect your credentials", "Report unauthorized access", "Regular password updates"]
                },
                {
                  title: "Content Guidelines",
                  items: ["Respect intellectual property", "No harmful content", "Accurate information"]
                },
                {
                  title: "Legal Compliance",
                  items: ["Follow applicable laws", "Pay applicable fees", "Report violations"]
                },
                {
                  title: "Communication",
                  items: ["Keep contact info updated", "Respond to notices", "Professional conduct"]
                }
              ].map((section, index) => (
                <div key={index} className="rounded-lg bg-gray-700/50 p-4">
                  <h5 className="mb-3 font-medium text-green-400">{section.title}</h5>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-center">
                        <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    ),
  
    "Accessibility": (
      <div className="space-y-6 text-gray-100">
        <div className="border-b border-gray-700 pb-4">
          <h3 className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-2xl font-bold text-transparent">
            Accessibility Statement
          </h3>
          <p className="mt-2 text-sm text-gray-400">Last reviewed: January 15, 2025</p>
        </div>
  
        <div className="space-y-6">
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">Our Commitment</h4>
            <div className="rounded-md bg-green-500/10 p-4 text-gray-300">
              <p>
                EcomineX  is committed to ensuring digital accessibility for people with disabilities.
                We are continually improving the user experience for everyone.
              </p>
            </div>
          </section>
  
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">Accessibility Features</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Technical Standards",
                  features: ["WCAG 2.1 compliance", "WAI-ARIA support", "HTML5 semantic markup"]
                },
                {
                  title: "Navigation",
                  features: ["Keyboard navigation", "Skip links", "Consistent layout"]
                },
                {
                  title: "Visual Aids",
                  features: ["High contrast mode", "Text resize options", "Clear typography"]
                },
                {
                  title: "Assistive Technology",
                  features: ["Screen reader compatible", "Alt text for images", "ARIA landmarks"]
                }
              ].map((section, index) => (
                <div key={index} className="rounded-lg bg-gray-700/50 p-4">
                  <h5 className="mb-3 font-medium text-green-400">{section.title}</h5>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {section.features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    ),
  
    "Cookie Policy": (
      <div className="space-y-6 text-gray-100">
        <div className="border-b border-gray-700 pb-4">
          <h3 className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-2xl font-bold text-transparent">
            Cookie Policy
          </h3>
          <p className="mt-2 text-sm text-gray-400">Last updated: January 15, 2025</p>
        </div>
  
        <div className="space-y-6">
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">What Are Cookies</h4>
            <div className="rounded-md bg-green-500/10 p-4 text-gray-300">
              <p>
                Cookies are small text files that are placed on your device when you visit our website.
                They help us provide you with a better experience and improve our services.
              </p>
            </div>
          </section>
  
          <section className="rounded-lg bg-gray-800/50 p-6">
            <h4 className="mb-4 text-lg font-semibold text-green-400">Types of Cookies We Use</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  type: "Essential Cookies",
                  description: "Required for basic site functionality",
                  examples: ["Authentication", "Security", "Load balancing"]
                },
                {
                  type: "Analytics Cookies",
                  description: "Help us understand how visitors use our site",
                  examples: ["Page views", "Traffic sources", "User behavior"]
                },
                {
                  type: "Preference Cookies",
                  description: "Remember your settings and choices",
                  examples: ["Language", "Theme", "Region"]
                },
                {
                  type: "Marketing Cookies",
                  description: "Help us deliver relevant advertisements",
                  examples: ["Ad targeting", "Campaign tracking", "User interests"]
                }
              ].map((cookie, index) => (
                <div key={index} className="rounded-lg bg-gray-700/50 p-4">
                  <h5 className="mb-2 font-medium text-green-400">{cookie.type}</h5>
                  <p className="mb-2 text-sm text-gray-300">{cookie.description}</p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    {cookie.examples.map((example, i) => (
                      <li key={i} className="flex items-center">
                        <div className="mr-2 h-1.5 w-1.5 rounded-full bg-green-400"></div>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    ),
  };
  
  export default legalContent;