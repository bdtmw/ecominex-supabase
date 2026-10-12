
import { AdminNavbar } from "@/components/AdminNavbar";
import AdminUsersPage from "@/components/AllProduct/AllUser";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import AllUserTabs from "@/components/Dashboard/AllUsers/AllUsers";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";


function Page() {

  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="User Management" desc="Manage and track all user activity with real-time updates and organized details." />
        <AllUserTabs />
        {/* <AdminUsersPage /> */}
      </DashboardLayout>
    </ProtectedRoutes>
  );
}

export default Page;
