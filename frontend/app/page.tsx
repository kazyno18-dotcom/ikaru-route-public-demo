'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) router.push('/route');
      else router.push('/login');
    }
  }, [user, isLoading, router]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1923',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', color: '#8a9bb5' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚗</div>
        <div>IkaruRoute を起動中...</div>
      </div>
    </div>
  );
}
