import React from "react";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import UserMachineAssignment from "@/components/Assign/UserMachineAssign";
import UserMachineList from "@/components/Assign/MachineCatalog";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Assign Machines" desc="Give a mining machine to a user and review current assignments." />
        <UserMachineAssignment />
        <UserMachineList />
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
