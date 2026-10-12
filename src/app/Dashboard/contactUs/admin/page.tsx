import AdminUsersPage from '@/components/AllProduct/AllUser'
import AdminProductTable from '@/components/AllProduct/ProductTable'
import ContactManagementDashboard from '@/components/contactUs/AllContact'
import DefaultLayout from '@/components/Layouts/DefaultLayout'
import LandingLayout from '@/components/Layouts/LandingLayout'
import DashboardLayout from '@/components/myAccount/layout'
import React from 'react'

function page() {
  return (
    <div>
      {/* <LandingLayout> */}
      <DashboardLayout>
        <ContactManagementDashboard/>
      </DashboardLayout>  
      {/* </LandingLayout> */}
    </div>
  )
}

export default page;
