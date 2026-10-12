import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import UserProfile from "@/components/Dashboard/UserProfile/UserProfile";
import React from "react";

function page() {
  return (
    <ProtectedRoutes>
      <div>
        <DashboardLayout>
          <DashboardHeader title="Account Settings" desc="View and update your profile information" />
          <UserProfile />
        </DashboardLayout>
      </div>
    </ProtectedRoutes>
  );
}

export default page;
