'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import BathroomIcon from '@mui/icons-material/Bathroom';
import KitchenIcon from '@mui/icons-material/Kitchen';
import BedIcon from '@mui/icons-material/Bed';
import WeekendIcon from '@mui/icons-material/Weekend';
import DiningIcon from '@mui/icons-material/Dining';
import BalconyIcon from '@mui/icons-material/Balcony';
import BuildIcon from '@mui/icons-material/Build';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { useSnackbar } from 'notistack';
import { apiClient } from '../../../../../../lib/api-client';

const ROOM_TYPES = [
  { type: 'BATHROOM', label: 'Bathroom', icon: <BathroomIcon sx={{ fontSize: 40 }} /> },
  { type: 'KITCHEN', label: 'Kitchen', icon: <KitchenIcon sx={{ fontSize: 40 }} /> },
  { type: 'BEDROOM', label: 'Bedroom', icon: <BedIcon sx={{ fontSize: 40 }} /> },
  { type: 'LIVING_ROOM', label: 'Living Room', icon: <WeekendIcon sx={{ fontSize: 40 }} /> },
  { type: 'DINING_ROOM', label: 'Dining Room', icon: <DiningIcon sx={{ fontSize: 40 }} /> },
  { type: 'BALCONY', label: 'Balcony', icon: <BalconyIcon sx={{ fontSize: 40 }} /> },
  { type: 'UTILITY', label: 'Utility', icon: <BuildIcon sx={{ fontSize: 40 }} /> },
  { type: 'CUSTOM', label: 'Custom', icon: <DashboardCustomizeIcon sx={{ fontSize: 40 }} /> },
];

export default function NewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { enqueueSnackbar } = useSnackbar();

  const [selectedType, setSelectedType] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: string, label: string) => {
    setSelectedType(type);
    if (!name) setName(label);
  };

  const handleSubmit = async () => {
    if (!selectedType || !name) return;
    setLoading(true);

    try {
      await apiClient.fetch(`/projects/${projectId}/rooms`, {
        method: 'POST',
        json: { name, type: selectedType },
      });
      enqueueSnackbar('Room added!', { variant: 'success' });
      router.push(`/projects/${projectId}`);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to add room', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Add Room
      </Typography>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Select Room Type
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {ROOM_TYPES.map((room) => (
          <Grid item xs={3} key={room.type}>
            <Card
              sx={{
                border: selectedType === room.type ? 2 : 1,
                borderColor: selectedType === room.type ? 'primary.main' : 'divider',
              }}
            >
              <CardActionArea onClick={() => handleTypeSelect(room.type, room.label)}>
                <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
                  <Box sx={{ color: selectedType === room.type ? 'primary.main' : 'text.secondary' }}>
                    {room.icon}
                  </Box>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    {room.label}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedType && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Room Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading || !name}
            fullWidth
          >
            {loading ? 'Adding...' : 'Add Room'}
          </Button>
        </Box>
      )}
    </Container>
  );
}
