'use client';

import { useParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PaletteIcon from '@mui/icons-material/Palette';
import { EmptyState } from '../../../../../../components/ui/empty-state';

export default function RoomDetailPage() {
  useParams(); // roomId will be used when API calls are wired

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Room Detail
        </Typography>
        <Chip label="Bathroom" size="small" color="primary" variant="outlined" sx={{ mt: 1 }} />
      </Box>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Photos
      </Typography>
      <EmptyState
        icon={<PhotoCameraIcon />}
        title="No Photos Yet"
        description="Capture or upload photos of this room to get started."
        actionLabel="Add Photo"
      />

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
