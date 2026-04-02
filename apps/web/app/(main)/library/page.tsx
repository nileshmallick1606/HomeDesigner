'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { EmptyState } from '../../../components/ui/empty-state';

const ROOM_TYPES = ['All', 'Bathroom', 'Kitchen', 'Bedroom', 'Living Room', 'Dining Room'];

export default function LibraryPage() {
  const [selectedTab, setSelectedTab] = useState(0);

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
          <Tab key={type} label={type} />
        ))}
      </Tabs>

      <EmptyState
        icon={<AutoAwesomeIcon />}
        title="Templates Coming Soon"
        description="Design templates for every room type and style will be available here."
      />
    </Container>
  );
}
