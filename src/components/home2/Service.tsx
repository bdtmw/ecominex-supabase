import Image from "next/image";
import Link from "next/link";

type Card = {
    titleTop: string;
    titleBottom: string;
    description: string;
    bullets: { title: string; body: string }[];
    bgImg: string; // path in /public
};

const CARDS: Card[] = [
    {
        titleTop: "Hosting",
        titleBottom: "services",
        description: "Host your equipment at EcomineX facilities. Secure premises with 24/7 monitoring and on-site experts. We manage everything: installation, maintenance, and repairs.",
        bullets: [
            {
                title: "Host your equipment at EcomineX sites",
                body:
                    "In secure premises, with a team of experts available on site 7 days a week.",
            },
            {
                title: "We manage everything for you",
                body:
                    "From the installation, to maintenance and reparation, we take care of your machines.",
            },
        ],
        bgImg: "/globe-s.svg",
    },
    {
        titleTop: "Purchase of",
        titleBottom: "machines",
        description: "Choose your machine and complete your purchase securely on our platform",
        bullets: [
            {
                title: "A simplified purchasing process",
                body:
                    "Your mining machines are guaranteed for 1 year and at the best price!",
            },
            {
                title: "Fast delivery and installation",
                body:
                    "Have you chosen your machines? EcomineX will take care of delivery, customs clearance and installation.",
            },
        ],
        bgImg: "/Purchases-of-machines.png.webp",
    },
    {
        titleTop: "Updates & Take",
        titleBottom: "Profit",
        description: "Host your equipment at EcomineX facilities. Secure premises with 24/7 monitoring and on-site experts. We manage everything: installation, maintenance, and repairs.",
        bullets: [
            {
                title: "Your own infrastructure",
                body:
                    "A ready-to-use container, entirely dedicated to your activity.",
            },
            {
                title: "Maximum autonomy, guaranteed performance",
                body:
                    "You control your production from A to Z, with technical support from EcomineX Hosting.",
            },
        ],
        bgImg: "/container.png.webp",
    },
];

export default function ServicesSection() {
    return (
  <section className="w-full bg-transparent py-12 sm:py-10 lg:py-20 relative">
    {/* Heading + description */}
    <div className="flex flex-col items-center text-center text-white px-4">
  <h1 className="font-[700] text-3xl sm:text-4xl md:text-[48px] leading-tight md:leading-[53px]">
    Our{" "}
    <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
      Services
    </span>
  </h1>

  <p className="mt-3 text-xs sm:text-sm md:text-[14.5px] text-[#d2d2d2] w-full sm:w-[80%] md:w-[60%] leading-relaxed">
    We offer you turnkey solutions for getting started in mining, without
    having to manage the purchase, installation, management and maintenance
    of the machines.
  </p>
</div>

    {/* Cards */}
    <div className="mt-8 sm:mt-10 relative  px-3 sm:px-4 md:px-6">
      <div className="grid gap-6 sm:gap-8 lg:gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => (
          <article
            key={i}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1a1a1a] to-[#111] py-8 sm:py-10 lg:py-12 px-6 sm:px-7 lg:px-9 shadow-[0_8px_30px_rgb(0,0,0,0.3)] min-h-[260px] lg:h-[350px]"
          >
            {/* background image + overlay */}
            <div>
              <img
                className="pointer-events-none select-none absolute -right-20 top-14 opacity-25 max-w-[60%] sm:max-w-none"
                src={card.bgImg}
                alt=""
              />
              <div className="absolute inset-0 bg-[#2e2e2ea2]" />
            </div>

            {/* content */}
            <h3 className="relative z-10 mb-3 sm:mb-4 leading-tight font-extrabold tracking-tight text-white">
              <span className="block text-2xl sm:text-[28px] lg:text-[32px] leading-[1.1]">
                {card.titleTop}
              </span>
              <span className="block text-2xl sm:text-[28px] lg:text-[32px] text-green-500">
                {card.titleBottom}
              </span>
            </h3>

            <ul className="relative z-10 space-y-3 sm:space-y-4">
              <li className="pl-5">
                <span className="absolute ml-[-18px] mt-2 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                <p className="text-gray-300 text-xs sm:text-[12.5px] leading-snug">
                  {card.description}
                </p>
              </li>
            </ul>
          </article>
        ))}
      </div>
    </div>

    {/* green blur */}
    <div className="absolute overflow-hidden bg-[#22c55e] -right-10 bottom-10 sm:bottom-16 blur-[139px] h-[250px] sm:h-[350px] w-[208px]" />

    {/* CTA */}
    <div className="flex justify-center mt-8 sm:mt-10 px-4">
      <Link href="/calculator/">
        <button className="font-semibold border px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-[13.5px] rounded-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition">
          Calculate my Profits
        </button>
      </Link>
    </div>
  </section>
);
}
