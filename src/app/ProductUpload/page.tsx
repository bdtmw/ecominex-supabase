import LandingLayout from '@/components/Layouts/LandingLayout'
import ProductUpload from '@/components/ProductUpload/ProductUpload'
import React from 'react'

function page() {
  return (
    <div>
      <LandingLayout>
        <ProductUpload/>
      </LandingLayout>
    </div>
  )
}

export default page
