import { Suspense } from "react";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import UserManagement from "@/components/Dashboard/analytics/UserManagement";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Users" desc="Find who needs attention, see their money at a glance, and open their ledger." />
        <Suspense fallback={null}>
          <UserManagement />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
