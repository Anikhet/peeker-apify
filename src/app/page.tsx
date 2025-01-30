import HomePage from '@/components/LandingPage'
import React, { Suspense } from 'react'

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    <HomePage/>
    </Suspense>
  )
  
}

export default page