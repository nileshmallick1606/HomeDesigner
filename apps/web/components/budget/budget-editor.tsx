'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../../lib/api-client';

const CATEGORIES = [
  'CIVIL',
  'FURNISHINGS',
  'BATHROOM_CAT',
  'KITCHEN_CAT',
  'ELECTRICAL',
  'OTHER',
] as const;

interface BudgetItem {
  id: string;
  category: string;
  estimatedAmount: number;
  actualAmount: number;
}

export function BudgetEditor({ roomId }: { roomId: string }) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchBudget = useCallback(() => {
    setLoading(true);
    apiClient
      .fetch<BudgetItem[]>(`/rooms/${roomId}/budget`)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await apiClient.fetch(`/rooms/${roomId}/budget/items`, {
        method: 'POST',
        json: { category, estimatedAmount, actualAmount },
      });
      setEstimatedAmount(0);
      setActualAmount(0);
      fetchBudget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await apiClient.fetch(`/budgets/items/${itemId}`, {
        method: 'DELETE',
      });
      fetchBudget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Existing items */}
      {items.length > 0 && (
        <List dense disablePadding sx={{ mb: 2 }}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              disableGutters
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(item.id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={item.category.replace(/_/g, ' ')}
                secondary={`Estimated: ₹${Number(item.estimatedAmount).toLocaleString()} · Actual: ₹${Number(item.actualAmount).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No budget items yet.
        </Typography>
      )}

      {/* Add Item Form */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Add Item
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
            fullWidth
          >
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>

          <TextField
            label="Estimated Amount"
            type="number"
            size="small"
            fullWidth
            value={estimatedAmount}
            onChange={(e) => setEstimatedAmount(Number(e.target.value))}
          />

          <TextField
            label="Actual Amount"
            type="number"
            size="small"
            fullWidth
            value={actualAmount}
            onChange={(e) => setActualAmount(Number(e.target.value))}
          />

          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitting ? 'Adding...' : 'Add Item'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
