'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Si el usuario ya tiene un grupo guardado, redirigir directamente
    const group = localStorage.getItem('porra_group');
    if (group) {
      router.replace(`/g/${group}`);
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) return null; // evita flash mientras redirige
  return <LandingPage />;
}
