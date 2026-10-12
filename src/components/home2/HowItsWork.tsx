// app/components/StepsSection.tsx
import clsx from "clsx";
import Link from "next/link";
type Step = { title: string; body: string };

const STEPS: Step[] = [
    {
        title: "Book a Call with an Advisor",
        body:
            "First, let’s talk. Book a call with one of our specialist advisors to define your goals and answer all your questions.",
    },
    {
        title: "Choose Your Machines",
        body:
            "We’ll guide you in selecting the best mining machines. Once you decide, we handle everything else.",
    },
    {
        title: "Purchase Your Machines",
        body:
            "Secure your investment with a seamless purchase process. Simple, transparent, and fully protected—so you can focus on results, not paperwork",
    },
    {
        title: "Setup & Configuration",
        body:
            "Our team installs and configures your machines in less than 48 hours. You’ll be mining with optimal performance right from the start.",
    },
    {
        title: "Track & Earn in Real Time",
        body:
            "Stay informed with your personal dashboard. Monitor performance in real time while we manage operations and you collect profits.",
    },
];

// For large screens we place cards on a 6-column grid:
// 01→cols 1-2, 02→3-4, 03→5-6, 04→2-3, 05→4-5
const COL_STARTS = [1, 3, 5, 2, 4];

function StepCard({
    step,
    index,
}: {
    step: Step;
    index: number;
}) {
    return (
        <article
            className={clsx(
                "relative rounded-2xl bg-transparent ",
                "text-gray-300",
                ""
            )}
        >
            {/* faint big step number */}
            <span className="pointer-events-none absolute -top-7 -right-7 text-[70px] font-extrabold leading-none text-white/5 select-none">
                {String(index + 1).padStart(2, "0")}
            </span>
            <span className="pointer-events-none absolute  -right-10 top-20 text-[70px] font-extrabold leading-none text-white/5 select-none border-[1px] border-green-500 h-8">

            </span>

            <h3 className="relative z-10 mb-3 text-[23px] w-[80%] font-extrabold leading-tight text-[#f5f5f5]">
                {step.title}
            </h3>
            <p className="relative z-10 text-[13.2px] leading-[17px] text-[#b3b3b3]">
                {step.body}
            </p>
        </article>
    );
}

export default function HowItsWork() {
    return (
        <section className="w-full bg-[#121212] py-14 px-2">
            <div className="text-white">
  <h1 className="font-[700] text-3xl sm:text-4xl md:text-[48px] leading-[1.15] md:leading-[53px]">
    How Its{" "}
    <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
      Works
    </span>
  </h1>
</div>

            <div className="mt-10">
                <div className="relative">

                    {/* grid */}
                    <div className="grid gap-20 md:grid-cols-2 lg:grid-cols-6 ">
                        {STEPS.map((s, i) => (
                            <div
                                key={i}
                                className={clsx(
                                    "col-span-1 md:col-span-1 bg-transparent",
                                    "lg:col-span-2",
                                    "lg:[grid-column-start:var(--col)]"
                                )}
                                style={
                                    { ["--col" as any]: String(COL_STARTS[i]) }
                                }
                            >
                                <StepCard step={s} index={i} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="items-center flex justify-center mt-16">
                <Link href="/contactUs/">
                    <button className="!font-semibold border-[1px] px-7 py-3 text-[13.5px] rounded-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition">
                        Talk to an expert
                    </button>
                </Link>
            </div>

            <div className='absolute overflow-hidden bg-[#22c55e]  blur-[139px]  -left-10 h-[120px] w-[160px]'></div>
        </section>
    );
}
