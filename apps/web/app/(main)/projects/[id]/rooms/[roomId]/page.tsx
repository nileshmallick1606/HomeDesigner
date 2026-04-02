'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PaletteIcon from '@mui/icons-material/Palette';
import { apiClient } from '../../../../../../lib/api-client';
import { EmptyState } from '../../../../../../components/ui/empty-state';
import { PhotoUpload } from '../../../../../../components/media/photo-upload';
import { PhotoGallery } from '../../../../../../components/media/photo-gallery';

interface Photo {
  id: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  width?: number;
  height?: number;
}

interface Room {
  id: string;
  name: string;
  type: string;
  notes?: string;
  photos: Photo[];
  _count?: { photos: number; designs: number };
}

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {room.name}
        </Typography>
        <Chip
          label={room.type.replace(/_/g, ' ')}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </Box>

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

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Designs
      </Typography>
      <EmptyState
        icon={<PaletteIcon />}
        title="No Designs Yet"
        description="Add photos first, then visualize changes."
      />
    </Container>
  );
}
