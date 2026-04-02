'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from 'next/link';
import { apiClient } from '../../../../../../../../lib/api-client';
import { BeforeAfterSlider } from '../../../../../../../../components/comparison/before-after-slider';

interface Visualization {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  modelVersion?: string;
  status: string;
  createdAt: string;
}

interface Design {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
  room: { photos: Array<{ originalUrl: string }> };
  visualizations: Visualization[];
}

export default function DesignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const designId = params.designId as string;
  const roomId = params.roomId as string;
  const projectId = params.id as string;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch room to get design data (no separate design endpoint yet)
    apiClient
      .fetch<{ designs: Design[] }>(`/rooms/${roomId}`)
      .then((room) => {
        const found = room.designs?.find((d: Design) => d.id === designId);
        if (found) {
          setDesign({ ...found, room: { photos: (room as unknown as { photos: Array<{ originalUrl: string }> }).photos } });
        } else {
          setError('Design not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId, designId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !design) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography color="error">{error || 'Design not found'}</Typography>
      </Container>
    );
  }

  const completedViz = design.visualizations?.find((v) => v.status === 'COMPLETED');
  const originalPhoto = design.room?.photos?.[0]?.originalUrl;

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Button
        component={Link}
        href={`/projects/${projectId}/rooms/${roomId}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Room
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {design.category.replace(/_/g, ' ')} Design
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip label={design.status} size="small" />
        <Chip label={`Model: ${completedViz?.modelVersion || 'N/A'}`} size="small" variant="outlined" />
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Created: {new Date(design.createdAt).toLocaleDateString()}
        </Typography>
      </Box>

      {completedViz && originalPhoto ? (
        <BeforeAfterSlider
          beforeSrc={originalPhoto}
          afterSrc={completedViz.imageUrl}
          height={400}
        />
      ) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No completed visualization yet.</Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => router.back()}>
          Regenerate
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={async () => {
            if (confirm('Delete this design?')) {
              try {
                await apiClient.fetch(`/ai/designs/${designId}`, { method: 'DELETE' });
                router.push(`/projects/${projectId}/rooms/${roomId}`);
              } catch {
                // Handle error
              }
            }
          }}
        >
          Delete
        </Button>
      </Box>
    </Container>
  );
}
