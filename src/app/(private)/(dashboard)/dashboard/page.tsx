'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/features/FullScreenLoader';
import DashboardClient from '@/components/features/DashboardClient';
import { useProfile } from '@/hooks/useProfile';

export default function Dashboard() {
  const { user, loading } = useAuth(); 
  const router = useRouter();
  const { profile } = useProfile();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]); 

  useEffect(() => {
    if (profile?.tipo?.toLowerCase() === 'familiar') {
      router.replace('/familiar-dashboard');
    }
  }, [profile?.tipo, router]);

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <DashboardClient />;
  }

  return null;
}