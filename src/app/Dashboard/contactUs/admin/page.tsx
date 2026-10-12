import React from "react";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import ContactManagementDashboard from "@/components/contactUs/AllContact";

function Page() {
  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="Contact Messages" desc="Table view of every message sent from the contact form." />
        <ContactManagementDashboard />
      </DashboardLayout>
    </ProtectedRoutes>
  );
}
export default Page;
