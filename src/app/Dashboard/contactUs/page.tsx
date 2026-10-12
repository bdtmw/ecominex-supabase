import DashboardLayout from '@/components/Dashboard/DasboardLayout/DasboardLayout'
import DashboardHeader from '@/components/Dashboard/DashboardHeader/DashboardHeader'
import React from 'react'
import ContactManagement from '@/components/Dashboard/ContactManagement/ContactManagement';
import ProtectedRoutes from '@/components/config/protectedRoute/ProtectedRoutes';

function page() {
  return (
    <ProtectedRoutes>
      <div>
        <DashboardLayout>
          <DashboardHeader title="Contact Management" />
          <ContactManagement />
        </DashboardLayout>
      </div>
    </ProtectedRoutes>
  )
}

export default page;
