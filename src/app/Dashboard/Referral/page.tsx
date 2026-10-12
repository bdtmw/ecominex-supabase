import DashboardHeader from '@/components/Layouts/DashboardHeader'
import DashboardLayout from '@/components/myAccount/layout'
import Referral from '@/components/Referral/Referral'
import React from 'react'

const page = () => {
    return (
        <DashboardLayout>
            <DashboardHeader />
            <Referral/>
        </DashboardLayout>
    )
}

export default page