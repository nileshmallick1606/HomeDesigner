'use client';

import { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// Upload uses fetch directly for FormData support

interface PhotoUploadProps {
  roomId: string;
  onUploadComplete?: () => void;
}

export function PhotoUpload({ roomId, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Max size: 20MB');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload directly to API (bypass Next.js proxy for multipart)
      const token = localStorage.getItem('interior_science_token');
      const apiHost = window.location.hostname;
      const response = await fetch(`http://${apiHost}:4000/api/media/upload/${roomId}`, {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
      }

      setProgress(100);
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <Button
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        fullWidth
        sx={{ py: 3, border: '2px dashed', borderColor: 'divider' }}
      >
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </Button>

      {uploading && (
        <LinearProgress
          variant={progress > 0 ? 'determinate' : 'indeterminate'}
          value={progress}
          sx={{ mt: 1 }}
        />
      )}

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
