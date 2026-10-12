import React from 'react'
import Calculator from '@/components/calculator/Calculator'
import LandingLayout from "@/components/Layouts/LandingLayout";

const page = () => {
  return (
    <div>
      <LandingLayout>
        <Calculator />
      </LandingLayout>
    </div>
  )
}

export default page