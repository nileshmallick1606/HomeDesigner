'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiClient.fetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        json: { email, password },
      });
      apiClient.setToken(result.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 400 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" fontWeight={600} sx={{ mb: 3, textAlign: 'center' }}>
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#1565C0' }}>
            Register
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
