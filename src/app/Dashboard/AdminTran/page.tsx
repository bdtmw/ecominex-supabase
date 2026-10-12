import AdminWithdrawaAll from '@/components/AllProduct/AdminTran';
import AdminTransactionsPage from '@/components/AllProduct/AllTransaction'
import LandingLayout from '@/components/Layouts/LandingLayout'
import DashboardLayout from '@/components/myAccount/layout';
import React from 'react'

function page() {
  return (
    <div>
      {/* <LandingLayout> */}
      <DashboardLayout>
        <AdminWithdrawaAll/>
      </DashboardLayout>
      {/* </LandingLayout> */}
    </div>
  )
}

export default page;
