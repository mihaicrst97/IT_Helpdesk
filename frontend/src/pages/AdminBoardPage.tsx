import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Pagination,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { extractApiError } from '../api/client';
import { fetchAdminTicketsApi, updateTicketStatusApi } from '../api/endpoints';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/StatusBadges';
import { useAuth } from '../context/useAuth';
import { TicketPriority, TicketStatus } from '../types/api';

export function AdminBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [statusError, setStatusError] = useState<string | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', { search, status, priority, categoryId, page }],
    queryFn: () =>
      fetchAdminTicketsApi({
        search,
        status,
        priority,
        categoryId,
        page,
        limit: 10,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { ticketId: string; status: TicketStatus }) =>
      updateTicketStatusApi(vars.ticketId, vars.status),
    onSuccess: async () => {
      setStatusError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['user-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket'] }),
      ]);
    },
    onError: (error: unknown) => {
      setStatusError(extractApiError(error, 'Failed to update ticket status.'));
    },
  });

  function handleReset(): void {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setPage(1);
  }

  const certifications = user?.certifications ?? [];
  const tickets = ticketsQuery.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.pagination;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Admin Management Board</h1>
          <p className="text-muted mb-2">
            Showing tickets matching your certified technical domains.
          </p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted">Active Certifications:</span>
            {certifications.length === 0 ? (
              <span className="small text-danger">None assigned</span>
            ) : (
              certifications.map((cert) => <CategoryBadge key={cert.id} name={cert.name} />)
            )}
          </div>
        </div>
        <Link to="/analytics" className="btn btn-outline-dark">
          View Analytics
        </Link>
      </div>

      {statusError && <Alert variant="danger">{statusError}</Alert>}

      <Card className="shadow-sm border mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="admin-search">
                <Form.Label className="small text-muted">Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Title or description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="admin-status">
                <Form.Label className="small text-muted">Status</Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as TicketStatus | '');
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="admin-priority">
                <Form.Label className="small text-muted">Priority</Form.Label>
                <Form.Select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as TicketPriority | '');
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="CRITICAL">CRITICAL</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="admin-category">
                <Form.Label className="small text-muted">Category</Form.Label>
                <Form.Select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Certified</option>
                  {certifications.map((cert) => (
                    <option key={cert.id} value={cert.id}>
                      {cert.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" className="w-100" onClick={handleReset}>
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border">
        <Card.Body className="p-0">
          {ticketsQuery.isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="dark">
                <span className="visually-hidden">Loading tickets...</span>
              </Spinner>
            </div>
          ) : ticketsQuery.isError ? (
            <Alert variant="danger" className="m-3">
              {extractApiError(ticketsQuery.error, 'Failed to load admin tickets.')}
            </Alert>
          ) : tickets.length === 0 ? (
            <div className="text-center text-muted py-5">
              No tickets match your certifications.
            </div>
          ) : (
            <Table
              responsive
              hover
              className="mb-0 align-middle"
              data-testid="admin-tickets-table"
            >
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Reporter</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Update Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="text-decoration-none fw-semibold"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="small">{ticket.author.fullName}</td>
                    <td>
                      <CategoryBadge name={ticket.category.name} />
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <Form.Select
                        size="sm"
                        aria-label={`Status for ${ticket.title}`}
                        data-testid="status-select"
                        value={ticket.status}
                        disabled={statusMutation.isPending}
                        onChange={(e) =>
                          statusMutation.mutate({
                            ticketId: ticket.id,
                            status: e.target.value as TicketStatus,
                          })
                        }
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </Form.Select>
                    </td>
                    <td className="text-muted small">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-muted small">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <Pagination className="mb-0">
            <Pagination.Prev
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <Pagination.Item
                key={pageNum}
                active={pageNum === pagination.page}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}
