'use client';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import BuyApollo from '@/components/Form';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // Correctly type the user
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth'); // Redirect to login if not authenticated
      } else {
        setUser(session.user); // Set the user correctly
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push('/auth'); // Redirect to login page after logout
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full py-4 bg-white shadow-md">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.email}</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <BuyApollo />
      </main>
    </div>
  );
};

export default Dashboard;
