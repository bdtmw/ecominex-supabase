import { Suspense } from "react";
import DepositResult from "@/components/deposit/DepositResult";

export const metadata = { title: "Payment not completed | Ecominex" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DepositResult cancelled />
    </Suspense>
  );
}
