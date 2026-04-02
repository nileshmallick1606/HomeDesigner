'use client';

import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';

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
  onDelete?: (photoId: string) => void;
}

export function PhotoGallery({ photos, onPhotoClick, onDelete }: PhotoGalleryProps) {
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (photos.length === 0) return null;

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const cols = isMobile ? 2 : isTablet ? 3 : 4;

  return (
    <>
      <ImageList cols={cols} gap={8}>
        {photos.map((photo) => (
          <ImageListItem
            key={photo.id}
            sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}
          >
            <img
              src={photo.thumbnailUrl || photo.originalUrl}
              alt="Room photo"
              loading="lazy"
              onClick={() => onPhotoClick?.(photo)}
              style={{ width: '100%', height: 120, objectFit: 'cover', cursor: 'pointer' }}
            />
            {onDelete && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(photo);
                }}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(211,47,47,0.8)' },
                  width: 28,
                  height: 28,
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </ImageListItem>
        ))}
      </ImageList>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this photo? This cannot be undone.
          {deleteTarget && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <img
                src={deleteTarget.thumbnailUrl || deleteTarget.originalUrl}
                alt="Photo to delete"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
