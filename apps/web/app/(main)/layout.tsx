'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { BottomTabs } from '../../components/navigation/bottom-tabs';
import { AuthProvider } from '../../lib/auth-context';
import { Suspense } from 'react';

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthProvider>
        <Box sx={{ pb: 8 }}>
          {children}
          <BottomTabs />
        </Box>
      </AuthProvider>
    </Suspense>
  );
}
