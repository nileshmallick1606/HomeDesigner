'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PaletteIcon from '@mui/icons-material/Palette';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import Alert from '@mui/material/Alert';
import { useSnackbar } from 'notistack';
import { needsConsentPrompt, setAIConsent, hasAIConsent } from '../../../../../../lib/ai-consent';
import { AIConsentDialog } from '../../../../../../components/ui/ai-consent-dialog';
import { apiClient } from '../../../../../../lib/api-client';
import { EmptyState } from '../../../../../../components/ui/empty-state';
import { PhotoUpload } from '../../../../../../components/media/photo-upload';
import { PhotoGallery } from '../../../../../../components/media/photo-gallery';
import { CategorySelector } from '../../../../../../components/visualization/category-selector';
import { JobStatus } from '../../../../../../components/ai/job-status';
import { BeforeAfterSlider } from '../../../../../../components/comparison/before-after-slider';
import { DesignCard } from '../../../../../../components/visualization/design-card';
import { BudgetEditor } from '../../../../../../components/budget/budget-editor';

interface Photo {
  id: string;
  originalUrl: string;
  thumbnailUrl: string | null;
}

interface Design {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
  visualizations?: Array<{ thumbnailUrl?: string; imageUrl?: string; status: string }>;
}

interface Room {
  id: string;
  name: string;
  type: string;
  projectId: string;
  photos: Photo[];
  designs: Design[];
}

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const projectId = params.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  // Segmentation state
  const [segmenting, setSegmenting] = useState(false);
  const [segJobId, setSegJobId] = useState('');
  const [segResult, setSegResult] = useState<{ maskUrl?: string; elements?: unknown; modelVersion?: string } | null>(null);

  // Visualization state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [preset, setPreset] = useState<'draft' | 'final'>('draft');
  const [generating, setGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  const fetchRoom = useCallback(() => {
    apiClient
      .fetch<Room>(`/rooms/${roomId}`)
      .then(setRoom)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const handleGenerate = async () => {
    if (!selectedCategory || !room || room.photos.length === 0) return;

    // Check consent before first AI generation (RA-DC-4)
    if (needsConsentPrompt()) {
      setShowConsent(true);
      return;
    }

    setGenerating(true);

    try {
      const result = await apiClient.fetch<{ jobId: string; designId: string }>('/ai/visualization', {
        method: 'POST',
        json: {
          roomPhotoId: room.photos[0].id,
          category: selectedCategory,
          preset,
        },
      });
      setActiveJobId(result.jobId);
      enqueueSnackbar('Visualization started!', { variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start visualization');
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to start visualization', { variant: 'error' });
      setGenerating(false);
    }
  };

  const handleDetectElements = async () => {
    if (!room || room.photos.length === 0) return;
    setSegmenting(true);
    setSegResult(null);
    setError('');

    try {
      const result = await apiClient.fetch<{ jobId: string }>('/ai/segmentation', {
        method: 'POST',
        json: { roomPhotoId: room.photos[0].id },
      });
      setSegJobId(result.jobId);
      enqueueSnackbar('Detection started!', { variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start segmentation');
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to start segmentation', { variant: 'error' });
      setSegmenting(false);
    }
  };

  const handleSegComplete = async () => {
    setSegmenting(false);
    setSegJobId('');
    // Fetch segmentation result
    if (room && room.photos.length > 0) {
      try {
        const result = await apiClient.fetch<{ maskUrl?: string; elements?: unknown; modelVersion?: string }>(
          `/ai/segmentation/${room.photos[0].id}`,
        );
        setSegResult(result);
      } catch {
        // Segmentation result may not be available yet
      }
    }
  };

  const handleJobComplete = () => {
    setGenerating(false);
    setActiveJobId('');
    // Refresh room to get new designs
    fetchRoom();
    // Show before/after for the latest result
    if (room && room.photos.length > 0) {
      // The visualization URL will be fetched when room refreshes
      // For now, just trigger refresh
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !room) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography color="error">{error || 'Room not found'}</Typography>
      </Container>
    );
  }

  // Find latest completed visualization for before/after display
  const latestDesign = room.designs?.find(
    (d) => d.visualizations?.some((v) => v.status === 'COMPLETED'),
  );
  const latestViz = latestDesign?.visualizations?.find((v) => v.status === 'COMPLETED');

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {room.name}
        </Typography>
        <Chip label={room.type.replace(/_/g, ' ')} size="small" color="primary" variant="outlined" sx={{ mt: 1 }} />
      </Box>

      {/* Photos Section */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Photos {room.photos.length > 0 && `(${room.photos.length})`}
      </Typography>

      {room.photos.length > 0 && (
        <PhotoGallery
          photos={room.photos}
          onDelete={async (photoId) => {
            const token = localStorage.getItem('interior_science_token');
            await fetch(`http://${window.location.hostname}:4000/api/media/${photoId}`, {
              method: 'DELETE',
              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            fetchRoom();
          }}
        />
      )}

      <Box sx={{ mt: 2, mb: 2 }}>
        <PhotoUpload roomId={roomId} onUploadComplete={fetchRoom} />
      </Box>

      {room.photos.length === 0 && (
        <EmptyState
          icon={<PhotoCameraIcon />}
          title="No Photos Yet"
          description="Upload photos of this room using the button above."
        />
      )}

      {/* Segmentation Section — Detect Elements */}
      {room.photos.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            <ViewInArIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Detect Room Elements
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            AI analyzes your room photo to identify walls, floor, ceiling, windows, and fixtures.
          </Typography>

          <Button
            variant="outlined"
            onClick={handleDetectElements}
            disabled={segmenting}
            startIcon={segmenting ? <CircularProgress size={18} /> : <ViewInArIcon />}
            sx={{ mb: 2 }}
          >
            {segmenting ? 'Detecting...' : 'Detect Elements'}
          </Button>

          {segJobId && (
            <JobStatus jobId={segJobId} onComplete={handleSegComplete} />
          )}

          {segResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Elements detected (model: {segResult.modelVersion || 'unknown'}).
              {segResult.maskUrl && (
                <Box component="img" src={segResult.maskUrl} alt="Segmentation mask"
                  sx={{ display: 'block', mt: 1, maxWidth: '100%', maxHeight: 200, borderRadius: 1, opacity: 0.8 }}
                />
              )}
            </Alert>
          )}
        </>
      )}

      {/* Visualization Section — only show when photos exist */}
      {room.photos.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Start Design
          </Typography>

          <CategorySelector onSelect={setSelectedCategory} selected={selectedCategory} />

          {selectedCategory && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <Chip
                  label="Draft (Fast)"
                  onClick={() => setPreset('draft')}
                  color={preset === 'draft' ? 'primary' : 'default'}
                  variant={preset === 'draft' ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Final (Quality)"
                  onClick={() => setPreset('final')}
                  color={preset === 'final' ? 'primary' : 'default'}
                  variant={preset === 'final' ? 'filled' : 'outlined'}
                />
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerate}
                disabled={generating}
                startIcon={generating ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {generating ? 'Generating...' : `Generate ${selectedCategory.replace(/_/g, ' ')} (${preset})`}
              </Button>
            </>
          )}

          {activeJobId && (
            <JobStatus jobId={activeJobId} onComplete={handleJobComplete} />
          )}

          {/* Show latest before/after */}
          {latestViz && room.photos[0] && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Latest Visualization
              </Typography>
              <BeforeAfterSlider
                beforeSrc={room.photos[0].originalUrl}
                afterSrc={latestViz.imageUrl || ''}
                height={300}
              />
            </Box>
          )}
        </>
      )}

      {/* Designs Section */}
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Designs {room.designs?.length > 0 && `(${room.designs.length})`}
      </Typography>

      {room.designs?.length > 0 ? (
        <Grid container spacing={2}>
          {room.designs.map((design) => (
            <Grid item xs={6} sm={4} key={design.id}>
              <DesignCard design={design} projectId={projectId} roomId={roomId} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={<PaletteIcon />}
          title="No Designs Yet"
          description={room.photos.length > 0 ? 'Select a category above and click Generate.' : 'Add photos first, then visualize changes.'}
        />
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">Budget</Typography>
      <BudgetEditor roomId={roomId} />

      {/* AI Consent Dialog (RA-DC-4) */}
      <AIConsentDialog
        open={showConsent}
        onConsent={() => {
          setAIConsent(true);
          setShowConsent(false);
          handleGenerate(); // Retry now that consent is given
        }}
        onDecline={() => {
          setAIConsent(false);
          setShowConsent(false);
          enqueueSnackbar('Cloud AI disabled. Using preview mode.', { variant: 'info' });
        }}
      />
    </Container>
  );
}
