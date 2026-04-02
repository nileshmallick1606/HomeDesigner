'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { apiClient } from '../../lib/api-client';

interface BudgetCategory {
  category: string;
  estimatedAmount: number;
  actualAmount: number;
}

interface BudgetData {
  overallBudget: number;
  totalEstimated: number;
  totalActual: number;
  categories: BudgetCategory[];
}

function getProgressColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent < 70) return 'success';
  if (percent <= 90) return 'warning';
  return 'error';
}

export function BudgetSummary({ projectId }: { projectId: string }) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .fetch<BudgetData>(`/projects/${projectId}/budget`)
      .then(setBudget)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }

  if (!budget) return null;

  const percentSpent =
    budget.overallBudget > 0
      ? Math.round((budget.totalActual / budget.overallBudget) * 100)
      : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Overall Budget
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          ₹{Number(budget.overallBudget).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Estimated
        </Typography>
        <Typography variant="body2">
          ₹{Number(budget.totalEstimated).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Total Actual
        </Typography>
        <Typography variant="body2">
          ₹{Number(budget.totalActual).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentSpent, 100)}
          color={getProgressColor(percentSpent)}
          sx={{ flex: 1, height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" fontWeight={600}>
          {percentSpent}%
        </Typography>
      </Box>

      {budget.categories.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Category Breakdown
          </Typography>
          <List dense disablePadding>
            {budget.categories.map((cat) => (
              <ListItem key={cat.category} disableGutters>
                <ListItemText
                  primary={cat.category.replace(/_/g, ' ')}
                  secondary={`Estimated: ₹${Number(cat.estimatedAmount).toLocaleString()} · Actual: ₹${Number(cat.actualAmount).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}
