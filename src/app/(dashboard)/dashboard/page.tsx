'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import DashboardClient from '@/components/DashboardClient';

export default function Dashboard() {
  const { user, loading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]); 

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <DashboardClient readOnly />;
  }

  return null;
}