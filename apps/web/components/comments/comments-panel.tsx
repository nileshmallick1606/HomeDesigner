'use client';

import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { apiClient } from '../../lib/api-client';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface CommentsPanelProps {
  projectId: string;
  roomId?: string;
}

export function CommentsPanel({ projectId, roomId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchComments = async () => {
    try {
      const params = new URLSearchParams({ projectId });
      if (roomId) params.set('roomId', roomId);
      const res = await apiClient.fetch<{ data: Comment[] }>(`/comments?${params.toString()}`);
      setComments(res.data || []);
    } catch {
      // ignore fetch errors
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, roomId]); // eslint-disable-line

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const body: { content: string; projectId: string; roomId?: string } = {
        content: newComment.trim(),
        projectId,
      };
      if (roomId) body.roomId = roomId;
      await apiClient.fetch('/comments', { method: 'POST', json: body });
      setNewComment('');
      await fetchComments();
      enqueueSnackbar('Comment posted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post comment', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <Card sx={{ p: 2, mt: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Comments ({comments.length})
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No comments yet. Be the first to comment.
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 360, overflowY: 'auto', mb: 2 }}>
          {comments.map((comment) => (
            <Box key={comment.id} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                {comment.author.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {comment.author.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(comment.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {comment.content}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          multiline
          maxRows={3}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          sx={{ minWidth: 'auto', px: 1.5 }}
        >
          <SendIcon fontSize="small" />
        </Button>
      </Box>
    </Card>
  );
}
