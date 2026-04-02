'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from 'next/link';
import { apiClient } from '../../../../../../../../lib/api-client';
import { BeforeAfterSlider } from '../../../../../../../../components/comparison/before-after-slider';
import { JobStatus } from '../../../../../../../../components/ai/job-status';

interface Visualization {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState('');

  const fetchDesign = () => {
    apiClient
      .fetch<Design>(`/ai/designs/${designId}`)
      .then(setDesign)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDesign();
  }, [designId]); // eslint-disable-line

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.fetch(`/ai/designs/${designId}`, { method: 'DELETE' });
      router.push(`/projects/${projectId}/rooms/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError('');
    try {
      const result = await apiClient.fetch<{ jobId: string }>(`/ai/designs/${designId}/regenerate`, {
        method: 'POST',
      });
      setActiveJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
      setRegenerating(false);
    }
  };

  const handleJobComplete = () => {
    setRegenerating(false);
    setActiveJobId('');
    fetchDesign();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !design) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!design) return null;

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

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={design.status} size="small" />
        <Chip label={`Model: ${completedViz?.modelVersion || 'N/A'}`} size="small" variant="outlined" />
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Created: {new Date(design.createdAt).toLocaleDateString()}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      {activeJobId && (
        <JobStatus jobId={activeJobId} onComplete={handleJobComplete} />
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={regenerating ? <CircularProgress size={18} /> : <RefreshIcon />}
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </Box>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Design</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete this design and all its visualizations. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
