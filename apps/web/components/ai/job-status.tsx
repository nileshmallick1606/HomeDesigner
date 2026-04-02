'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import Button from '@mui/material/Button';
import { apiClient } from '../../lib/api-client';

interface JobStatusProps {
  jobId: string;
  onComplete?: () => void;
  onRetry?: () => void;
}

type Status = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface JobData {
  status: Status;
  error?: string;
}

export function JobStatus({ jobId, onComplete, onRetry }: JobStatusProps) {
  const [status, setStatus] = useState<Status>('QUEUED');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;

    const poll = setInterval(async () => {
      try {
        const data = await apiClient.fetch<JobData>(`/ai/jobs/${jobId}`);
        setStatus(data.status);
        if (data.status === 'COMPLETED') {
          clearInterval(poll);
          onComplete?.();
        } else if (data.status === 'FAILED') {
          clearInterval(poll);
          setError(data.error || 'Processing failed');
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [jobId, onComplete]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
      {status === 'QUEUED' && (
        <>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">Queued — waiting to process...</Typography>
        </>
      )}
      {status === 'PROCESSING' && (
        <>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">Processing — this may take up to 60 seconds...</Typography>
        </>
      )}
      {status === 'COMPLETED' && (
        <>
          <CheckCircleIcon color="success" />
          <Typography variant="body2" color="success.main">Complete!</Typography>
        </>
      )}
      {status === 'FAILED' && (
        <>
          <ErrorIcon color="error" />
          <Typography variant="body2" color="error">{error || 'Failed'}</Typography>
          {onRetry && (
            <Button size="small" variant="outlined" onClick={onRetry}>
              Retry
            </Button>
          )}
        </>
      )}
    </Box>
  );
}
