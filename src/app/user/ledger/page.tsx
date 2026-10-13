"use client";

import { Suspense } from "react";
import UserLedger from "@/components/myAccount/UserLedger";

export default function LedgerPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ledger</h1>
        <p className="text-sm text-gray-400">Every deposit, withdrawal, purchase, profit and bonus on your account.</p>
      </div>
      <Suspense fallback={null}>
        <UserLedger />
      </Suspense>
    </div>
  );
}
