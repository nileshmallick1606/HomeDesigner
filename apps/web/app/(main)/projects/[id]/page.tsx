'use client';

import { useParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import Link from 'next/link';
import { EmptyState } from '../../../../components/ui/empty-state';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  // TODO: Fetch project from API
  const rooms: unknown[] = [];

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Project Detail
        </Typography>
        <Chip label="Draft" size="small" color="default" sx={{ mt: 1 }} />
      </Box>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Rooms
      </Typography>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<MeetingRoomIcon />}
          title="No Rooms Yet"
          description="Add rooms to start planning your renovation."
          actionLabel="Add Room"
          actionHref={`/projects/${projectId}/rooms/new`}
        />
      ) : (
        <Typography>Room cards will appear here.</Typography>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        component={Link}
        href={`/projects/${projectId}/rooms/new`}
        sx={{ mt: 2 }}
      >
        Add Room
      </Button>
    </Container>
  );
}
