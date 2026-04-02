'use client';

import { SnackbarProvider } from 'notistack';

export function AppSnackbarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      style={{ marginBottom: 64 }} // Above bottom tabs
    >
      {children}
    </SnackbarProvider>
  );
}
