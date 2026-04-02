'use client';

import { useEffect, useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { EmptyState } from '../../../components/ui/empty-state';
import { apiClient } from '../../../lib/api-client';

const ROOM_TYPES = ['All', 'Bathroom', 'Kitchen', 'Bedroom', 'Living Room', 'Dining Room'];

interface Template {
  id: string;
  name: string;
  category: string;
  roomType: string;
  thumbnailUrl?: string;
}

export default function LibraryPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedType = ROOM_TYPES[selectedTab];

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    const query = selectedType === 'All' ? '' : `?roomType=${encodeURIComponent(selectedType)}`;
    apiClient
      .fetch<Template[]>(`/templates${query}`)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [selectedType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleTabChange = (_: unknown, value: number) => {
    setSelectedTab(value);
  };

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Design Library
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {ROOM_TYPES.map((type) => (
          <Tab key={type} label={type} />
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
          description={
            selectedType === 'All'
              ? 'No design templates are available yet.'
              : `No templates found for ${selectedType}.`
          }
        />
      ) : (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid item xs={6} md={4} key={template.id}>
              <Card>
                <Box
                  sx={{
                    height: 140,
                    backgroundColor: template.thumbnailUrl ? undefined : 'grey.200',
                    backgroundImage: template.thumbnailUrl
                      ? `url(${template.thumbnailUrl})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <CardContent sx={{ pb: '12px !important' }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.category}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
