import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Row, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { extractApiError } from '../api/client';
import {
  addTicketCommentApi,
  fetchTicketByIdApi,
  updateTicketStatusApi,
} from '../api/endpoints';
import {
  CategoryBadge,
  PriorityBadge,
  RoleBadge,
  StatusBadge,
} from '../components/StatusBadges';
import { useAuth } from '../context/useAuth';
import { TicketStatus } from '../types/api';

const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('OPEN');
  const [actionError, setActionError] = useState<string | null>(null);

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketByIdApi(id ?? ''),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (ticketQuery.data) {
      setSelectedStatus(ticketQuery.data.status);
    }
  }, [ticketQuery.data]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: TicketStatus) => updateTicketStatusApi(id ?? '', nextStatus),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
        queryClient.invalidateQueries({ queryKey: ['user-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-analytics'] }),
      ]);
    },
    onError: (error: unknown) => {
      setActionError(extractApiError(error, 'Failed to update ticket status.'));
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addTicketCommentApi(id ?? '', content),
    onSuccess: async () => {
      setActionError(null);
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
        queryClient.invalidateQueries({ queryKey: ['user-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
      ]);
    },
    onError: (error: unknown) => {
      setActionError(extractApiError(error, 'Failed to post comment.'));
    },
  });

  if (ticketQuery.isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="dark">
          <span className="visually-hidden">Loading ticket...</span>
        </Spinner>
      </div>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div>
        <Alert variant="danger">
          {extractApiError(ticketQuery.error, 'Ticket could not be loaded.')}
        </Alert>
        <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="btn btn-dark">
          Go Back
        </Link>
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const isCertifiedAdmin =
    user?.role === 'ADMIN' &&
    user.certifications.some((cert) => cert.id === ticket.category.id);

  function onCommentSubmit(values: CommentFormValues): void {
    setActionError(null);
    commentMutation.mutate(values.content);
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link
          to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
          className="btn btn-outline-secondary btn-sm"
        >
          Back to List
        </Link>
      </div>

      {actionError && <Alert variant="danger">{actionError}</Alert>}

      <Card className="shadow-sm border mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h1 className="h4 mb-2">{ticket.title}</h1>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <CategoryBadge name={ticket.category.name} />
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} testId="ticket-status-badge" />
              </div>
            </div>

            {isCertifiedAdmin && (
              <div className="d-flex align-items-center gap-2">
                <Form.Select
                  size="sm"
                  aria-label="Ticket Status"
                  data-testid="detail-status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  disabled={statusMutation.isPending}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </Form.Select>
                <Button
                  size="sm"
                  variant="dark"
                  disabled={statusMutation.isPending || selectedStatus === ticket.status}
                  onClick={() => statusMutation.mutate(selectedStatus)}
                >
                  {statusMutation.isPending ? 'Saving...' : 'Update Status'}
                </Button>
              </div>
            )}
          </div>

          <Row className="text-muted small border-top border-bottom py-2 mb-3 g-2">
            <Col md={4}>
              <strong>Reporter:</strong> {ticket.author.fullName} ({ticket.author.email})
            </Col>
            <Col md={4}>
              <strong>Assigned Admin:</strong>{' '}
              {ticket.assignedAdmin ? ticket.assignedAdmin.fullName : 'Unassigned'}
            </Col>
            <Col md={4}>
              <strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}
            </Col>
          </Row>

          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
            {ticket.description}
          </p>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border">
        <Card.Header className="bg-white">
          <h2 className="h6 mb-0">Discussion Thread ({ticket.comments.length})</h2>
        </Card.Header>
        <ListGroup variant="flush">
          {ticket.comments.length === 0 ? (
            <ListGroup.Item className="text-muted py-4 text-center">
              No comments yet.
            </ListGroup.Item>
          ) : (
            ticket.comments.map((comment) => (
              <ListGroup.Item key={comment.id} className="py-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <strong>{comment.author.fullName}</strong>
                    <RoleBadge role={comment.author.role} />
                  </div>
                  <span className="text-muted small">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </p>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
        <Card.Body className="border-top bg-light">
          <Form onSubmit={handleSubmit(onCommentSubmit)} noValidate>
            <Form.Group className="mb-2" controlId="ticket-comment-input">
              <Form.Label className="small fw-semibold">Add a Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Write a troubleshooting update or question..."
                isInvalid={Boolean(errors.content)}
                {...register('content')}
              />
              <Form.Control.Feedback type="invalid">
                {errors.content?.message}
              </Form.Control.Feedback>
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button type="submit" variant="dark" size="sm" disabled={commentMutation.isPending}>
                {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
