import React from 'react'
import DashboardLayout from '@/components/Dashboard/DasboardLayout/DasboardLayout'
import DashboardHeader from '@/components/Dashboard/DashboardHeader/DashboardHeader'
import Transactions from '@/components/Dashboard/Transactions/Transactions'
import ProtectedRoutes from '@/components/config/protectedRoute/ProtectedRoutes'

function page() {
  return (

    <ProtectedRoutes>
      <div>
        <DashboardLayout>
          <DashboardHeader title="Withdrawal Management" />
          <Transactions />
        </DashboardLayout>
      </div>
    </ProtectedRoutes>
  )
}

export default page;
