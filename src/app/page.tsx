import HomePage from '@/components/HomePage'
// import WebsiteDown from '@/components/WebsiteDown'
import React, { Suspense } from 'react'

const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    <HomePage/>
    </Suspense>

    // <WebsiteDown/>

  )
  
}

export default page