'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { cn } from '@/lib/utils'; // Adjust the import path as necessary
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'send' | 'verify'>('send'); // Current stage of the process
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle sending OTP
  const handleSendOtp = async () => {
	setError(null);
	setSuccess(null);
	setLoading(true);
  
	try {
	  const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
		},
	  });
	  if (error) throw error;
	  setSuccess('OTP sent to your email. Please check your inbox.');
	  setStage('verify'); // Move to OTP verification stage
  } catch (err: unknown) {
    if (err instanceof Error) {
      setError(err.message || 'Something went wrong. Please try again.');
    } else {
      setError('Something went wrong. Please try again.');
    }
	} finally {
	  setLoading(false);
	}
  };
  

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email', // Specify the verification type
      });
      if (error) throw error;
      setSuccess('OTP verified successfully!');
      router.push('/dashboard'); // Redirect to dashboard after verification
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Invalid OTP. Please try again.');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (

    
    <div className="flex  items-center justify-center">
       <AnimatedGridPattern
        numSquares={200}
        maxOpacity={0.1}
        duration={1}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
        )}
      />
      <div className="w-full max-w-md p-10 space-y-6 bg-white ">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          {stage === 'send' ? 'Login to Apollo Scraper' : 'Verify OTP'}
        </h1>
        <p className="text-sm text-center text-gray-600">
          {stage === 'send'
            ? 'Enter your email to receive a one-time password (OTP) or log in with Google.'
            : 'Enter the OTP sent to your email.'}
        </p>
        <div className="space-y-4">
          {stage === 'send' && (
            <>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <RainbowButton   onClick={handleSendOtp}
                disabled={loading}
                className={`w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-lg ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600 focus:ring-2 focus:ring-blue-400'
                }`}>  {loading ? 'Sending...' : 'Send OTP'}</RainbowButton>
            
             
        
            </>
          )}
          {stage === 'verify' && (
            <>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className={`w-full px-4 py-2 font-bold text-white bg-green-500 rounded-lg ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600 focus:ring-2 focus:ring-green-400'
                }`}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <p className="text-sm text-center text-gray-600">
                Didn’t receive an OTP?{' '}
                <button
                  onClick={() => setStage('send')}
                  className="text-blue-500 hover:underline"
                >
                  Resend
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
