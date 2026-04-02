'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import Link from 'next/link';
import { EmptyState } from '../../../components/ui/empty-state';

export default function ProjectsPage() {
  const projects: unknown[] = [];

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          My Projects
        </Typography>
      </Box>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOffIcon />}
          title="No Projects Yet"
          description="Create your first renovation project to get started."
          actionLabel="New Project"
          actionHref="/projects/new"
        />
      ) : (
        <Typography>Project list will appear here.</Typography>
      )}

      <Fab
        color="primary"
        component={Link}
        href="/projects/new"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}
