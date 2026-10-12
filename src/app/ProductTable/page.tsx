import AdminProductTable from '@/components/AllProduct/ProductTable'
import DefaultLayout from '@/components/Layouts/DefaultLayout'
import LandingLayout from '@/components/Layouts/LandingLayout'
import React from 'react'

function page() {
  return (
    <div>
      <LandingLayout>
        <AdminProductTable/>
      </LandingLayout>
    </div>
  )
}

export default page;
