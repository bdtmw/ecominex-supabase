import { Suspense } from "react";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import AdminOverview from "@/components/Dashboard/analytics/AdminOverview";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Overview" desc="How money is moving, who is active, and what needs a decision today." />
        <Suspense fallback={null}>
          <AdminOverview />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
