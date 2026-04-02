'use client';

import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import { apiClient } from '../../../lib/api-client';
import { EmptyState } from '../../../components/ui/empty-state';

interface Project {
  id: string;
  name: string;
  status: string;
  overallBudget?: number;
  updatedAt: string;
  _count?: { rooms: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .fetch<{ data: Project[] }>('/projects')
      .then((res) => setProjects(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} key={project.id}>
              <Card>
                <CardActionArea component={Link} href={`/projects/${project.id}`}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {project.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                      <Chip label={project.status} size="small" />
                      {project._count && (
                        <Typography variant="caption" color="text.secondary">
                          {project._count.rooms} room{project._count.rooms !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                    {project.overallBudget && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Budget: ₹{Number(project.overallBudget).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
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
