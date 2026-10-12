export default function WeMineSection() {
  return (
    <section className="bg-primary px-8 py-16 text-white md:px-16 lg:px-32">
      {/* Container */}
      <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:items-center">
        {/* Left Section */}
        <div className="flex-1 text-center md:text-left">
          <p className="mb-2 font-bold uppercase text-green-500">
            Some Words About Us
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Join the <span className="text-white">Ecomine X</span>
            <br />
            Community Today!
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex flex-1 flex-col gap-8">
          {/* Innovative Collaboration */}
          <div>
            <h2 className="mb-2 text-xl font-bold">Innovative collaboration</h2>
            <p className="text-gray-300">
              We work closely with industry experts to drive cutting-edge
              advancements in mining technology, ensuring that our customers
              have access to the most efficient solutions.
            </p>
          </div>

          {/* Miner-Centric Approach */}
          <div>
            <h2 className="mb-2 text-xl font-bold">
              EcomineX-centric approach
            </h2>
            <p className="text-gray-300">
              We prioritize understanding their unique needs, providing
              personalized support, and delivering customised solutions to help
              them maximize their mining capabilities and achieve their goals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
