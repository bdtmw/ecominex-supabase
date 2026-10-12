import React from 'react'
import DashboardLayout from '@/components/Dashboard/DasboardLayout/DasboardLayout'
import DashboardHeader from '@/components/Dashboard/DashboardHeader/DashboardHeader'
import MachineHero from '@/components/Dashboard/MachineHero/MachineHero'
import ProtectedRoutes from '@/components/config/protectedRoute/ProtectedRoutes'

function Page() {
  return (
    <ProtectedRoutes>
      <div>

        <DashboardLayout>
          <DashboardHeader title='Machine Management' desc='Monitor your mining shares performance and profit accumulation.' />
          <MachineHero />
        </DashboardLayout>

      </div>
    </ProtectedRoutes>
  )
}

export default Page;   
