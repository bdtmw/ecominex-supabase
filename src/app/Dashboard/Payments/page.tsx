'use client'

import DashboardHeader from '@/components/Layouts/DashboardHeader';
import UserMachinesDashboard from '@/components/myAccount/assignProfile';
import DashboardLayout from '@/components/myAccount/layout';
import WithdrawalDashboard from '@/components/myAccount/withdraw';
import React from 'react'

function page() {
  return (
    <div>
        <DashboardLayout>
        <DashboardHeader /> 
        <WithdrawalDashboard/>
        </DashboardLayout>
    </div>
  )
}

export default page;
