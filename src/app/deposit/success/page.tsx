import { Suspense } from "react";
import DepositResult from "@/components/deposit/DepositResult";

export const metadata = { title: "Deposit status | Ecominex" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DepositResult  />
    </Suspense>
  );
}
