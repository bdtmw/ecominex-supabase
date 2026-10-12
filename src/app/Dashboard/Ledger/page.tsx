import { Suspense } from "react";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import Ledger from "@/components/Dashboard/analytics/Ledger";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Ledger" desc="Every deposit, withdrawal, purchase, payout and bonus in one searchable record." />
        <Suspense fallback={null}>
          <Ledger />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
