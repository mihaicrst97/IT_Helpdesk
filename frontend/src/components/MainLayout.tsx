import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { RoleBadge } from './StatusBadges';

export function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-secondary">
        <Container>
          <Navbar.Brand as={NavLink} to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}>
            IT Helpdesk
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar-nav" />
          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/dashboard">
                My Tickets
              </Nav.Link>
              <Nav.Link as={NavLink} to="/tickets/new">
                New Ticket
              </Nav.Link>
              {user?.role === 'ADMIN' && (
                <>
                  <Nav.Link as={NavLink} to="/admin">
                    Admin Board
                  </Nav.Link>
                  <Nav.Link as={NavLink} to="/analytics">
                    Analytics
                  </Nav.Link>
                </>
              )}
            </Nav>
            {user && (
              <div className="d-flex align-items-center gap-3 mt-2 mt-lg-0">
                <span className="text-light small">
                  {user.fullName} <RoleBadge role={user.role} />
                </span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="py-4 flex-grow-1">
        <Outlet />
      </Container>
    </div>
  );
}
