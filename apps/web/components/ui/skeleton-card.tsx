'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';

interface SkeletonCardGridProps {
  count?: number;
  columns?: { xs: number; sm: number };
}

export function SkeletonCardGrid({ count = 6, columns = { xs: 12, sm: 6 } }: SkeletonCardGridProps) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={columns.xs} sm={columns.sm} key={i}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width="70%" height={28} animation="wave" />
              <Skeleton variant="text" width="40%" height={20} animation="wave" sx={{ mt: 1 }} />
              <Skeleton variant="text" width="50%" height={16} animation="wave" sx={{ mt: 0.5 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
