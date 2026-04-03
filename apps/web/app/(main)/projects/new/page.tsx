'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useSnackbar } from 'notistack';
import { apiClient } from '../../../../lib/api-client';

export default function NewProjectPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const project = await apiClient.fetch<{ id: string }>('/projects', {
        method: 'POST',
        json: {
          name,
          description: description || undefined,
          overallBudget: budget ? Number(budget) : undefined,
        },
      });
      enqueueSnackbar('Project created!', { variant: 'success' });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create project', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        New Project
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="e.g., Flat 302 Renovation"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe your renovation plans..."
            />
            <TextField
              label="Overall Budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              fullWidth
              type="number"
              placeholder="500000"
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography> }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading || !name} fullWidth>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
