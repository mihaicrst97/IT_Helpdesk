import { Badge } from 'react-bootstrap';
import { Role, TicketPriority, TicketStatus } from '../types/api';

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  switch (priority) {
    case 'CRITICAL':
      return <Badge bg="danger">CRITICAL</Badge>;
    case 'MEDIUM':
      return (
        <Badge bg="warning" text="dark">
          MEDIUM
        </Badge>
      );
    default:
      return <Badge bg="secondary">LOW</Badge>;
  }
}

export function StatusBadge({
  status,
  testId,
}: {
  status: TicketStatus;
  testId?: string;
}) {
  switch (status) {
    case 'OPEN':
      return (
        <Badge bg="primary" data-testid={testId}>
          Open
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge bg="info" text="dark" data-testid={testId}>
          In Progress
        </Badge>
      );
    case 'RESOLVED':
      return (
        <Badge bg="success" data-testid={testId}>
          Resolved
        </Badge>
      );
  }
}

export function CategoryBadge({ name }: { name: string }) {
  return (
    <Badge bg="light" text="dark" className="border">
      {name}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge bg={role === 'ADMIN' ? 'info' : 'secondary'} text={role === 'ADMIN' ? 'dark' : undefined}>
      {role}
    </Badge>
  );
}
