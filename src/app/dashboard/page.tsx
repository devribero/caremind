'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import AppLayout from '@/components/layout/AppLayout';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

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
    return (
      <AppLayout>
        <DashboardOverview />
      </AppLayout>
    );
  }

  return null;
}