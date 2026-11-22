import { useQuery } from '@tanstack/react-query';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Alert, Badge, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Bar, Doughnut } from 'react-chartjs-2';
import { extractApiError } from '../api/client';
import { fetchAdminAnalyticsApi } from '../api/endpoints';
import { useAuth } from '../context/useAuth';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function AnalyticsPage() {
  const { user } = useAuth();
  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchAdminAnalyticsApi,
  });

  if (analyticsQuery.isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="dark">
          <span className="visually-hidden">Loading analytics...</span>
        </Spinner>
      </div>
    );
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <Alert variant="danger">
        {extractApiError(analyticsQuery.error, 'Unable to load analytics.')}
      </Alert>
    );
  }

  const data = analyticsQuery.data;
  const openCount = data.byStatus.find((item) => item.status === 'OPEN')?.count ?? 0;
  const inProgressCount = data.byStatus.find((item) => item.status === 'IN_PROGRESS')?.count ?? 0;
  const resolvedCount = data.byStatus.find((item) => item.status === 'RESOLVED')?.count ?? 0;

  const categoryChartData = {
    labels: data.byCategory.map((item) => item.categoryName),
    datasets: [
      {
        label: 'Tickets',
        data: data.byCategory.map((item) => item.count),
        backgroundColor: '#212529',
        borderRadius: 4,
      },
    ],
  };

  const priorityChartData = {
    labels: data.byPriority.map((item) => item.priority),
    datasets: [
      {
        data: data.byPriority.map((item) => item.count),
        backgroundColor: ['#6c757d', '#ffc107', '#dc3545'],
      },
    ],
  };

  const statusChartData = {
    labels: ['Open', 'In Progress', 'Resolved'],
    datasets: [
      {
        data: [openCount, inProgressCount, resolvedCount],
        backgroundColor: ['#0d6efd', '#0dcaf0', '#198754'],
      },
    ],
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 mb-1">Analytics & Certifications</h1>
        <p className="text-muted mb-0">
          Metrics scoped to {user?.fullName}&apos;s certified technical categories.
        </p>
      </div>

      <Card className="shadow-sm border mb-4">
        <Card.Body>
          <h2 className="h6 mb-3">Active Administrator Certifications</h2>
          {data.certifications.length === 0 ? (
            <p className="text-muted mb-0">No active certifications assigned to this account.</p>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {data.certifications.map((cert) => (
                <Badge key={cert.id} bg="dark" className="py-2 px-3 fw-normal">
                  {cert.name} (Certified {new Date(cert.certifiedAt).toLocaleDateString()})
                </Badge>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <Card className="shadow-sm border">
            <Card.Body>
              <div className="text-muted small">Total Certified Tickets</div>
              <div className="h3 mb-0 mt-1">{data.totalTickets}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="shadow-sm border">
            <Card.Body>
              <div className="text-muted small">Open</div>
              <div className="h3 mb-0 mt-1 text-primary">{openCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="shadow-sm border">
            <Card.Body>
              <div className="text-muted small">In Progress</div>
              <div className="h3 mb-0 mt-1 text-info">{inProgressCount}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="shadow-sm border">
            <Card.Body>
              <div className="text-muted small">Resolved</div>
              <div className="h3 mb-0 mt-1 text-success">{resolvedCount}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white">
              <h2 className="h6 mb-0">Distribution by Category</h2>
            </Card.Header>
            <Card.Body>
              {data.byCategory.length === 0 ? (
                <div className="text-muted text-center py-4">No certified categories.</div>
              ) : (
                <Bar
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white">
              <h2 className="h6 mb-0">Distribution by Priority</h2>
            </Card.Header>
            <Card.Body className="d-flex justify-content-center align-items-center">
              <div style={{ maxWidth: '260px', width: '100%' }}>
                <Doughnut data={priorityChartData} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border h-100">
            <Card.Header className="bg-white">
              <h2 className="h6 mb-0">Distribution by Status</h2>
            </Card.Header>
            <Card.Body className="d-flex justify-content-center align-items-center">
              <div style={{ maxWidth: '260px', width: '100%' }}>
                <Doughnut data={statusChartData} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
