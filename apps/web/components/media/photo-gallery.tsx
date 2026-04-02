'use client';

import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';

interface Photo {
  id: string;
  thumbnailUrl: string | null;
  originalUrl: string;
  width?: number;
  height?: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export function PhotoGallery({ photos, onPhotoClick }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <ImageList cols={3} gap={8}>
      {photos.map((photo) => (
        <ImageListItem
          key={photo.id}
          onClick={() => onPhotoClick?.(photo)}
          sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden' }}
        >
          <img
            src={photo.thumbnailUrl || photo.originalUrl}
            alt="Room photo"
            loading="lazy"
            style={{ width: '100%', height: 120, objectFit: 'cover' }}
          />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
