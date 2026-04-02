'use client';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import PersonIcon from '@mui/icons-material/Person';
import { EmptyState } from '../../../components/ui/empty-state';

export default function ProfilePage() {
  return (
    <Container maxWidth="sm" sx={{ pt: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Profile
      </Typography>
      <EmptyState
        icon={<PersonIcon />}
        title="Your Profile"
        description="Profile settings and account management will be available here."
      />
    </Container>
  );
}
