'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { EmptyState } from '../../../components/ui/empty-state';

export default function CapturePage() {
  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Capture
      </Typography>
      <EmptyState
        icon={<CameraAltIcon />}
        title="Camera Capture Coming Soon"
        description="You'll be able to photograph your rooms directly from here. For now, upload photos from the room detail page."
      />
    </Container>
  );
}
