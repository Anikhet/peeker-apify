'use client'
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessPageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const session_id = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  
  
  interface SessionDetails {
    id: string;
    amount: number;
    currency: string;
    // Add other fields as necessary
  }

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);

  useEffect(() => {
    if (!session_id) {
      setLoading(false);
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        const response = await fetch(`/api/stripe/payment-session?session_id=${session_id}`);
        if (!response.ok) throw new Error('Failed to fetch session details');
        const data = await response.json();
        setSessionDetails(data);
      } catch (error) {
        console.error('Error fetching session details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [session_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg font-semibold text-gray-700">Loading payment details...</p>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg font-semibold text-red-600">Payment session not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
      <h1 className="text-4xl font-bold mb-6 text-green-600">🎉 Payment Successful!</h1>
      <p className="text-xl mb-4">Sit back and relax while we process your payment details.</p>
      <p className="text-lg text-gray-600 mb-8">Session ID: {session_id}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
      >
        Go to Homepage
      </button>
    </div>
  );
}
