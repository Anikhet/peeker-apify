'use client';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import BuyApollo from '@/components/Form';
import { DropdownDemo } from '@/components/ui/dropdown-avatar-profile-options';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null); // Correctly type the user
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redirect to login if not authenticated
      } else {
        setUser(session.user); // Set the user correctly
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);


  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen px-10">
      <header className="w-full py-4 bg-white ">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.email}</h1>
          <DropdownDemo />
      
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <BuyApollo />
      </main>
    </div>
  );
};

export default Dashboard;
