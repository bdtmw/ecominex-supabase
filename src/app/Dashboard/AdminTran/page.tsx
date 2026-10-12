import React from "react";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import AdminWithdrawaAll from "@/components/AllProduct/AdminTran";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Withdrawal History" desc="Every processed withdrawal, with filters by status and date." />
        <AdminWithdrawaAll />
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
