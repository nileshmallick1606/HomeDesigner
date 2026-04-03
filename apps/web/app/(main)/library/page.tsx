'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BathroomIcon from '@mui/icons-material/Bathroom';
import KitchenIcon from '@mui/icons-material/Kitchen';
import BedIcon from '@mui/icons-material/Bed';
import WeekendIcon from '@mui/icons-material/Weekend';
import DiningIcon from '@mui/icons-material/Dining';
import BalconyIcon from '@mui/icons-material/Balcony';
import { EmptyState } from '../../../components/ui/empty-state';
import { useSnackbar } from 'notistack';
import { apiClient } from '../../../lib/api-client';

const ROOM_TYPES = ['All', 'BATHROOM', 'KITCHEN', 'BEDROOM', 'LIVING_ROOM', 'DINING_ROOM', 'BALCONY'];
const ROOM_TYPE_LABELS: Record<string, string> = {
  All: 'All', BATHROOM: 'Bathroom', KITCHEN: 'Kitchen', BEDROOM: 'Bedroom',
  LIVING_ROOM: 'Living Room', DINING_ROOM: 'Dining Room', BALCONY: 'Balcony',
};

const CATEGORY_COLORS: Record<string, string> = {
  CIVIL: '#795548', FURNISHINGS: '#FF9800', BATHROOM_CAT: '#2196F3',
  KITCHEN_CAT: '#4CAF50', ELECTRICAL: '#FFC107', OTHER: '#9E9E9E',
};

const ROOM_ICONS: Record<string, React.ReactNode> = {
  BATHROOM: <BathroomIcon sx={{ fontSize: 48, color: 'white' }} />,
  KITCHEN: <KitchenIcon sx={{ fontSize: 48, color: 'white' }} />,
  BEDROOM: <BedIcon sx={{ fontSize: 48, color: 'white' }} />,
  LIVING_ROOM: <WeekendIcon sx={{ fontSize: 48, color: 'white' }} />,
  DINING_ROOM: <DiningIcon sx={{ fontSize: 48, color: 'white' }} />,
  BALCONY: <BalconyIcon sx={{ fontSize: 48, color: 'white' }} />,
};

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  roomType: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export default function LibraryPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; type: string; _count?: { photos: number } }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const selectedType = ROOM_TYPES[selectedTab];

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    const query = selectedType === 'All' ? '' : `?roomType=${selectedType}`;
    apiClient
      .fetch<{ data: Template[] }>(`/templates${query}`)
      .then((res) => setTemplates(res.data || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [selectedType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Design Library
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {ROOM_TYPES.map((type) => (
          <Tab key={type} label={ROOM_TYPE_LABELS[type] || type} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<AutoAwesomeIcon />}
          title="No Templates Found"
          description={selectedType === 'All' ? 'No design templates available yet.' : `No templates for ${ROOM_TYPE_LABELS[selectedType]}.`}
        />
      ) : (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid item xs={6} md={4} key={template.id}>
              <Card>
                <CardActionArea onClick={() => setSelectedTemplate(template)}>
                  <Box
                    sx={{
                      height: 140,
                      bgcolor: CATEGORY_COLORS[template.category] || '#9E9E9E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    {ROOM_ICONS[template.roomType] || <AutoAwesomeIcon sx={{ fontSize: 48, color: 'white' }} />}
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                      {template.category.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {template.name}
                    </Typography>
                    <Chip
                      label={ROOM_TYPE_LABELS[template.roomType] || template.roomType}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate} onClose={() => setSelectedTemplate(null)} maxWidth="sm" fullWidth>
        {selectedTemplate && (
          <>
            <DialogTitle>{selectedTemplate.name}</DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  height: 180,
                  bgcolor: CATEGORY_COLORS[selectedTemplate.category] || '#9E9E9E',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                {ROOM_ICONS[selectedTemplate.roomType] || <AutoAwesomeIcon sx={{ fontSize: 64, color: 'white' }} />}
              </Box>
              {selectedTemplate.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedTemplate.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={ROOM_TYPE_LABELS[selectedTemplate.roomType] || selectedTemplate.roomType} size="small" color="primary" />
                <Chip label={selectedTemplate.category.replace(/_/g, ' ')} size="small" variant="outlined" />
                {selectedTemplate.tags?.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
              {/* Apply to Room Flow */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                Apply to Room
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Select Project</InputLabel>
                <Select
                  value={selectedProjectId}
                  label="Select Project"
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedRoomId('');
                    setApplyError('');
                    if (e.target.value) {
                      apiClient.fetch<Array<{ id: string; name: string; type: string; _count?: { photos: number } }>>(`/projects/${e.target.value}/rooms`)
                        .then(setRooms)
                        .catch(() => setRooms([]));
                    }
                  }}
                  onOpen={() => {
                    if (projects.length === 0) {
                      apiClient.fetch<{ data: Array<{ id: string; name: string }> }>('/projects')
                        .then((res) => setProjects(res.data || []))
                        .catch(() => {});
                    }
                  }}
                >
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedProjectId && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Select Room</InputLabel>
                  <Select
                    value={selectedRoomId}
                    label="Select Room"
                    onChange={(e) => { setSelectedRoomId(e.target.value); setApplyError(''); }}
                  >
                    {rooms.map((r) => (
                      <MenuItem key={r.id} value={r.id} disabled={!r._count?.photos}>
                        {r.name} ({r.type.replace(/_/g, ' ')})
                        {!r._count?.photos && ' — No photos'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {applyError && <Alert severity="error" sx={{ mb: 1 }}>{applyError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setSelectedTemplate(null); setSelectedProjectId(''); setSelectedRoomId(''); setApplyError(''); }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={!selectedRoomId || applying}
                onClick={async () => {
                  if (!selectedTemplate || !selectedRoomId) return;
                  setApplying(true);
                  setApplyError('');
                  try {
                    const result = await apiClient.fetch<{ projectId: string; roomId: string }>(`/templates/${selectedTemplate.id}/apply`, {
                      method: 'POST',
                      json: { roomId: selectedRoomId },
                    });
                    enqueueSnackbar('Template applied!', { variant: 'success' });
                    setSelectedTemplate(null);
                    setSelectedProjectId('');
                    setSelectedRoomId('');
                    router.push(`/projects/${result.projectId}/rooms/${result.roomId}`);
                  } catch (err) {
                    setApplyError(err instanceof Error ? err.message : 'Failed to apply template');
                    enqueueSnackbar(err instanceof Error ? err.message : 'Failed to apply template', { variant: 'error' });
                  } finally {
                    setApplying(false);
                  }
                }}
              >
                {applying ? 'Applying...' : 'Apply Template'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
