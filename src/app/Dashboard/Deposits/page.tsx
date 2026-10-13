import { Suspense } from "react";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import Deposits from "@/components/Dashboard/analytics/Deposits";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Deposits" desc="Crypto (NOWPayments) and manual deposits, with anything that needs a human flagged." />
        <Suspense fallback={null}>
          <Deposits />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
