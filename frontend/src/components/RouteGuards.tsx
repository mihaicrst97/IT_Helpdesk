import { Spinner } from 'react-bootstrap';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function CenteredSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <Spinner animation="border" role="status" variant="dark">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <CenteredSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <CenteredSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <CenteredSpinner />;
  }

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
