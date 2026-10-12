import LandingLayout from '@/components/Layouts/LandingLayout'
import AssigMachineUser from '@/components/myAccount/assignProfile'
// import DashboardHero from '@/components/myAccount/Hero'
import { AdminNavbar } from '@/components/AdminNavbar'
import ProtectedRoutes from '@/components/config/protectedRoute/ProtectedRoutes'
import React from 'react'
import DashboardLayout from '@/components/Dashboard/DasboardLayout/DasboardLayout'
import DashboardHeader from '@/components/Dashboard/DashboardHeader/DashboardHeader'
import DashboardHero from '@/components/Dashboard/DashboardHero/DashboardHero'
import { AdminRoute } from '@/components/adminRoute'

function Page() {
  return (

    <ProtectedRoutes>
      <div>
        <DashboardLayout>
          <DashboardHeader title={"Admin Dashboard!"} desc={"Track your activity and manage your account settings from your personalized dashboard."} />
          <DashboardHero />
        </DashboardLayout>

      </div>
    </ProtectedRoutes>
  )
}

export default Page;   
