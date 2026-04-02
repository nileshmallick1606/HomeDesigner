'use client';

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Link from 'next/link';

interface DesignCardProps {
  design: {
    id: string;
    name: string;
    category: string;
    status: string;
    createdAt: string;
    visualizations?: Array<{ thumbnailUrl?: string; imageUrl?: string; status: string }>;
  };
  projectId: string;
  roomId: string;
}

export function DesignCard({ design, projectId, roomId }: DesignCardProps) {
  const completedViz = design.visualizations?.find((v) => v.status === 'COMPLETED');
  const thumbnail = completedViz?.thumbnailUrl || completedViz?.imageUrl;

  return (
    <Card>
      <CardActionArea
        component={Link}
        href={`/projects/${projectId}/rooms/${roomId}/designs/${design.id}`}
      >
        {thumbnail && (
          <Box
            component="img"
            src={thumbnail}
            alt={design.name}
            sx={{ width: '100%', height: 120, objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ py: 1.5 }}>
          <Typography variant="caption" fontWeight={600}>
            {design.category.replace(/_/g, ' ')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Chip
              label={design.status}
              size="small"
              color={design.status === 'FINAL' ? 'success' : 'default'}
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
