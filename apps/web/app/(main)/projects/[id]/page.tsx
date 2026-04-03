'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import ShareIcon from '@mui/icons-material/Share';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { downloadBlob } from '../../../../lib/download';
import IconButton from '@mui/material/IconButton';
import { ShareDialog } from '../../../../components/sharing/share-dialog';
import { CommentsPanel } from '../../../../components/comments/comments-panel';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import BathroomIcon from '@mui/icons-material/Bathroom';
import KitchenIcon from '@mui/icons-material/Kitchen';
import BedIcon from '@mui/icons-material/Bed';
import WeekendIcon from '@mui/icons-material/Weekend';
import DiningIcon from '@mui/icons-material/Dining';
import BalconyIcon from '@mui/icons-material/Balcony';
import BuildIcon from '@mui/icons-material/Build';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import { apiClient } from '../../../../lib/api-client';
import { EmptyState } from '../../../../components/ui/empty-state';
import { BudgetSummary } from '../../../../components/budget/budget-summary';

const ROOM_ICONS: Record<string, React.ReactNode> = {
  BATHROOM: <BathroomIcon />,
  KITCHEN: <KitchenIcon />,
  BEDROOM: <BedIcon />,
  LIVING_ROOM: <WeekendIcon />,
  DINING_ROOM: <DiningIcon />,
  BALCONY: <BalconyIcon />,
  UTILITY: <BuildIcon />,
  CUSTOM: <DashboardCustomizeIcon />,
};

interface Room {
  id: string;
  name: string;
  type: string;
  _count?: { photos: number; designs: number };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  overallBudget?: number;
  rooms: Room[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    apiClient
      .fetch<Project>(`/projects/${projectId}`)
      .then(setProject)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography color="error">{error || 'Project not found'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight={700}>
            {project.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={exportingPdf ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
              disabled={exportingPdf}
              onClick={async () => {
                setExportingPdf(true);
                try {
                  await downloadBlob(
                    `http://${window.location.hostname}:4000/api/export/project/${projectId}/pdf`,
                    `${project.name.replace(/\s+/g, '-')}.pdf`,
                  );
                } catch { /* snackbar in SPEC-028 */ }
                setExportingPdf(false);
              }}
            >
              {exportingPdf ? 'Exporting...' : 'PDF'}
            </Button>
            <IconButton onClick={() => setShareDialogOpen(true)} color="primary">
              <ShareIcon />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
          <Chip label={project.status} size="small" color="default" />
          {project.overallBudget && (
            <Typography variant="body2" color="text.secondary">
              Budget: ₹{Number(project.overallBudget).toLocaleString()}
            </Typography>
          )}
        </Box>
        {project.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {project.description}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Rooms ({project.rooms.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          component={Link}
          href={`/projects/${projectId}/rooms/new`}
        >
          Add Room
        </Button>
      </Box>

      {project.rooms.length === 0 ? (
        <EmptyState
          icon={<MeetingRoomIcon />}
          title="No Rooms Yet"
          description="Add rooms to start planning your renovation."
          actionLabel="Add Room"
          actionHref={`/projects/${projectId}/rooms/new`}
        />
      ) : (
        <Grid container spacing={2}>
          {project.rooms.map((room) => (
            <Grid item xs={6} sm={4} key={room.id}>
              <Card>
                <CardActionArea
                  component={Link}
                  href={`/projects/${projectId}/rooms/${room.id}`}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box sx={{ color: 'primary.main', mb: 1 }}>
                      {ROOM_ICONS[room.type] || <DashboardCustomizeIcon />}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {room.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {room.type.replace('_', ' ')}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">Budget</Typography>
      <BudgetSummary projectId={projectId} />

      <CommentsPanel projectId={projectId} />

      <ShareDialog
        projectId={projectId}
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />
    </Container>
  );
}
