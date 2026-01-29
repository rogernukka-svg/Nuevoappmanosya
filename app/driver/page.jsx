'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/driver/onboard');
  }, [router]);

  return null;
}
