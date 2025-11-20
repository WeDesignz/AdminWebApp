'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to orders page with transactions tab
    router.replace('/orders?tab=transactions');
  }, [router]);

  return null;
}
