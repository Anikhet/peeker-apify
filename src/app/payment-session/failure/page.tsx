'use client'
import React from 'react';
import {  useRouter } from 'next/navigation';

// import { createClient } from '@supabase/supabase-js';

export default function PaymentSuccessPageComponent() {

  const router = useRouter();


  




  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
      <h1 className="text-4xl font-bold mb-6 text-green-600">No Worries!</h1>
      <p className="text-xl mb-4">Head back to homepage and start building your lead list! </p>
      {/* <p className="text-lg text-gray-600 mb-8">⁠You will receive your order within 12 hours      </p> */}
      {/* <p className='text-muted-foreground flex gap-2 items-center justify-center'><Info/> On average, your list will be delivered to your email within 4 hours.</p> */}
      <button
        onClick={() => router.push('/apollo')}
        className="px-6 py-3  bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
      >
        Go to Homepage
      </button>
    </div>
  );
}
