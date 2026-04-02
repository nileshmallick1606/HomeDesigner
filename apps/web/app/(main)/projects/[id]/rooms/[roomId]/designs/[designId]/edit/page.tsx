'use client';

import { useParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import Link from 'next/link';

export default function DesignEditorPage() {
  const params = useParams();
  const designId = params.designId as string;
  const roomId = params.roomId as string;
  const projectId = params.id as string;

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Button
        component={Link}
        href={`/projects/${projectId}/rooms/${roomId}/designs/${designId}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Design
      </Button>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        <EditIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Design Editor
      </Typography>

      <Box
        sx={{
          width: '100%',
          height: 500,
          bgcolor: 'grey.100',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: 'grey.300',
        }}
      >
        <Typography color="text.secondary">
          Fabric.js editor canvas will load here.
          <br />
          (Dynamic import — loads only on this page)
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        The Fabric.js v6 editor with drawing, text, shapes, undo/redo, and auto-save will be available here.
        Canvas state persists to the database for seamless resume.
      </Typography>
    </Container>
  );
}
