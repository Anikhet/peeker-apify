'use client'
import React, { Suspense } from 'react';

import PaymentSuccessPageComponent from '@/components/payment-page';

export default function PaymentSuccessPage() {


return (<Suspense >
    <PaymentSuccessPageComponent/>


</Suspense>)
}