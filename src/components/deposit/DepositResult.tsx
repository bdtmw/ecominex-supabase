"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

type Status = {
  id: string; status: string; amount: number; credited: boolean; needsReview: boolean;
  invoiceUrl: string | null; actuallyPaid: number | null;
};

const IN_PROGRESS = ["creating", "waiting", "confirming", "confirmed", "sending"];
const POLL_MS = 5000, GIVE_UP_MS = 5 * 60 * 1000;
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-6 text-center text-white shadow-xl sm:p-8">
      <p className="mb-5 text-2xl font-bold">Ecomine <span className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-base">X</span></p>
      {children}
    </div>
  </main>
);

const Btn = ({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) => (
  <Link href={href} className={`inline-block rounded-full px-5 py-2.5 text-sm font-semibold transition ${primary ? "bg-green-600 text-white hover:bg-green-500" : "border border-white/20 text-gray-200 hover:border-green-500/60 hover:text-white"}`}>{children}</Link>
);

/** Where NOWPayments sends the user back to. Polls until the callback has credited the deposit. */
export default function DepositResult({ cancelled = false }: { cancelled?: boolean }) {
  const depositId = useSearchParams().get("depositId") || "";
  const [s, setS] = useState<Status | null>(null);
  const [error, setError] = useState<"auth" | "missing" | "network" | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    if (!depositId) { setError("missing"); return; }
    let stop = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const { data } = await axiosInstance.get<Status>(`/api/v1/deposit/status/${depositId}`);
        if (stop) return;
        setS(data); setError(null);
        const settled = data.credited || !IN_PROGRESS.includes(data.status);
        if (settled) return;
        if (Date.now() - started.current > GIVE_UP_MS) { setGaveUp(true); return; }
      } catch (e: any) {
        if (stop) return;
        const code = e?.response?.status;
        if (code === 401) { setError("auth"); return; }
        if (code === 404) { setError("missing"); return; }
        setError("network");
      }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { stop = true; clearTimeout(timer); };
  }, [depositId]);

  if (error === "auth") return <Shell><p className="mb-4 text-gray-300">Please log in to see the status of your deposit.</p><Btn href="/auth/signin" primary>Log in</Btn></Shell>;
  if (error === "missing") return <Shell><XCircle className="mx-auto mb-3 h-12 w-12 text-gray-400" aria-hidden /><h1 className="text-xl font-semibold">We couldn't find that deposit</h1><p className="mt-2 mb-5 text-sm text-gray-400">Check your wallet history, or start a new deposit.</p><Btn href="/user/wallet" primary>Go to wallet</Btn></Shell>;

  if (!s) return <Shell><Loader2 className="mx-auto h-10 w-10 animate-spin text-green-500" aria-hidden /><p className="mt-4 text-gray-300" role="status">Checking your payment…</p>{error === "network" && <p className="mt-2 text-sm text-yellow-400">Connection problem, retrying…</p>}</Shell>;

  if (s.credited) return (
    <Shell>
      <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-500" aria-hidden />
      <h1 className="text-2xl font-semibold" role="status">Deposit credited</h1>
      <p className="mt-2 text-gray-300">{usd(s.amount)} has been added to your balance.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Btn href="/user/wallet" primary>Go to wallet</Btn><Btn href="/user/dashboard">Dashboard</Btn></div>
      <p className="mt-6 break-all text-[11px] text-gray-500">Reference {s.id}</p>
    </Shell>
  );

  if (s.status === "partially_paid" || s.status === "review" || s.needsReview) return (
    <Shell>
      <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-yellow-400" aria-hidden />
      <h1 className="text-xl font-semibold" role="status">We're reviewing your payment</h1>
      <p className="mt-2 text-sm text-gray-300">{s.status === "partially_paid" && s.actuallyPaid != null ? `We received ${s.actuallyPaid} of the ${usd(s.amount)} you requested. ` : ""}Your deposit hasn't been credited yet. Our team has been notified. Please contact support and quote the reference below.</p>
      <div className="mt-6"><Btn href="/contactUs" primary>Contact support</Btn></div>
      <p className="mt-6 break-all text-[11px] text-gray-500">Reference {s.id}</p>
    </Shell>
  );

  if (s.status === "failed" || s.status === "expired" || s.status === "refunded") return (
    <Shell>
      <XCircle className="mx-auto mb-3 h-12 w-12 text-red-400" aria-hidden />
      <h1 className="text-xl font-semibold" role="status">{s.status === "expired" ? "This payment expired" : s.status === "refunded" ? "This payment was refunded" : "The payment didn't complete"}</h1>
      <p className="mt-2 mb-6 text-sm text-gray-400">No funds were added to your balance. You can start a new deposit at any time.</p>
      <Btn href="/user/wallet" primary>Try again</Btn>
      <p className="mt-6 break-all text-[11px] text-gray-500">Reference {s.id}</p>
    </Shell>
  );

  // still in progress
  return (
    <Shell>
      {cancelled ? <Clock className="mx-auto mb-3 h-12 w-12 text-gray-300" aria-hidden /> : <Loader2 className="mx-auto mb-3 h-12 w-12 animate-spin text-green-500" aria-hidden />}
      <h1 className="text-xl font-semibold" role="status">{cancelled ? "Payment not completed" : s.status === "waiting" ? "Waiting for your payment" : "Confirming on the network"}</h1>
      <p className="mt-2 text-sm text-gray-300">
        {cancelled
          ? `You left the payment page. Nothing was charged. If you already sent ${usd(s.amount)}, your balance updates automatically once it confirms.`
          : s.status === "waiting" ? `Send ${usd(s.amount)} using the payment page. We'll credit your balance as soon as it confirms.` : "We've seen your payment. This usually takes a few minutes. Your balance updates automatically."}
      </p>
      {gaveUp && <p className="mt-3 text-sm text-yellow-300">This is taking longer than usual. You can safely leave this page. Your balance updates by itself once the payment confirms.</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {s.invoiceUrl && <a href={s.invoiceUrl} className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500">{cancelled ? "Resume payment" : "Open payment page"}</a>}
        <Btn href="/user/wallet">Back to wallet</Btn>
      </div>
      <p className="mt-6 break-all text-[11px] text-gray-500">Reference {s.id}</p>
    </Shell>
  );
}
