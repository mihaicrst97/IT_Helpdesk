import { useQuery } from '@tanstack/react-query';
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
import { fetchCategoriesApi, fetchUserTicketsApi } from '../api/endpoints';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/StatusBadges';
import { TicketPriority, TicketStatus } from '../types/api';

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesApi,
  });

  const ticketsQuery = useQuery({
    queryKey: ['user-tickets', { search, status, priority, categoryId, page }],
    queryFn: () =>
      fetchUserTicketsApi({
        search,
        status,
        priority,
        categoryId,
        page,
        limit: 10,
      }),
  });

  function handleReset(): void {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setPage(1);
  }

  const tickets = ticketsQuery.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.pagination;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <p className="text-muted mb-0">Track the status of your submitted support requests.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-dark">
          New Ticket
        </Link>
      </div>

      <Card className="shadow-sm border mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group controlId="dashboard-search">
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
              <Form.Group controlId="dashboard-status">
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
              <Form.Group controlId="dashboard-priority">
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
              <Form.Group controlId="dashboard-category">
                <Form.Label className="small text-muted">Category</Form.Label>
                <Form.Select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {(categoriesQuery.data ?? []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
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
              {extractApiError(ticketsQuery.error, 'Failed to load tickets.')}
            </Alert>
          ) : tickets.length === 0 ? (
            <div className="text-center text-muted py-5">No tickets found.</div>
          ) : (
            <Table responsive hover className="mb-0 align-middle" data-testid="tickets-table">
              <thead className="table-light">
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Comments</th>
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
                    <td>
                      <CategoryBadge name={ticket.category.name} />
                    </td>
                    <td>
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>{ticket._count?.comments ?? 0}</td>
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
