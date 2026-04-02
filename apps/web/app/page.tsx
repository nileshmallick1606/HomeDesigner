'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
          px: 2,
        }}
      >
        <Typography variant="h3" component="h1" fontWeight={700} color="primary">
          InteriorScience
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 400 }}>
          See your renovated space before a single wall is touched.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered before/after visualization for home interiors.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/register"
          sx={{ mt: 2, px: 4 }}
        >
          Get Started
        </Button>
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1565C0', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
