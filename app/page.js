'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const group = localStorage.getItem('porra_group');
    if (group) {
      router.replace(`/g/${group}`);
    } else {
      // Migración one-time: usuarios legacy de lonjas
      const me = localStorage.getItem('porra_me');
      if (me && !localStorage.getItem('porra_me_lonjas')) {
        localStorage.setItem('porra_me_lonjas', me);
        localStorage.setItem('porra_group_name_lonjas', 'Lonjas');
        localStorage.setItem('porra_group', 'lonjas');
        router.replace('/g/lonjas');
        return;
      }
      setReady(true);
    }
  }, []);

  if (!ready) return null; // evita flash mientras redirige
  return <LandingPage />;
}
