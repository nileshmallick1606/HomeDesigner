'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { apiClient } from '../../../../../../../../../lib/api-client';

// Dynamic import — Fabric.js needs DOM (P3-DC-4)
const CanvasEditor = dynamic(
  () => import('../../../../../../../../../components/editor/canvas-editor'),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={50} sx={{ mb: 1 }} animation="wave" />
        <Skeleton variant="rectangular" height={400} animation="wave" />
        <Skeleton variant="rectangular" height={50} sx={{ mt: 1 }} animation="wave" />
      </Box>
    ),
  },
);

interface Design {
  id: string;
  category: string;
  canvasState?: Record<string, unknown> | null;
  room: {
    photos: Array<{ originalUrl: string }>;
  };
  visualizations: Array<{ imageUrl: string; status: string }>;
}

export default function DesignEditorPage() {
  const params = useParams();
  const designId = params.designId as string;
  const roomId = params.roomId as string;
  const projectId = params.id as string;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .fetch<Design>(`/ai/designs/${designId}`)
      .then(setDesign)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [designId]);

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

  const roomPhotoUrl = design.room?.photos?.[0]?.originalUrl || '';
  const vizUrl = design.visualizations?.find((v) => v.status === 'COMPLETED')?.imageUrl;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          component={Link}
          href={`/projects/${projectId}/rooms/${roomId}/designs/${designId}`}
          startIcon={<ArrowBackIcon />}
          size="small"
        >
          Back
        </Button>
        <Typography variant="subtitle1" fontWeight={600}>
          {design.category.replace(/_/g, ' ')} Editor
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <CanvasEditor
          roomPhotoUrl={roomPhotoUrl}
          visualizationUrl={vizUrl}
          canvasState={design.canvasState}
          designId={designId}
        />
      </Box>
    </Box>
  );
}
