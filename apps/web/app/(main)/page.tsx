'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { EmptyState } from '../../components/ui/empty-state';

export default function DashboardPage() {
  // TODO: Fetch projects from API when auth context is wired
  const projects: unknown[] = [];

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
        </Typography>
      </Box>

      {projects.length === 0 ? (
        <EmptyState
          icon={<HomeWorkIcon />}
          title="Start Your Renovation Journey"
          description="Create your first project to begin visualizing your dream home."
          actionLabel="Create New Project"
          actionHref="/projects/new"
        />
      ) : (
        <Typography>Projects will appear here.</Typography>
      )}
    </Container>
  );
}
