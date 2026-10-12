import AdminProductTable from '@/components/AllProduct/ProductTable'
import LandingLayout from '@/components/Layouts/LandingLayout'
import React from 'react'
import DashboardLayout from '@/components/myAccount/layout';
import DashboardHeader from '@/components/Layouts/DashboardHeader';
import UserMachineAssignment from '@/components/Assign/UserMachineAssign';
import UserMachineList from '@/components/Assign/MachineCatalog';

function page() {
  return (
    <div>
      {/* <LandingLayout> */}
        <DashboardLayout>
        <DashboardHeader />     
        <UserMachineAssignment/>
        <UserMachineList/>
        </DashboardLayout>
      {/* </LandingLayout> */}
    </div>
  )
}

export default page;
