import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { extractApiError } from '../api/client';
import { createTicketApi, fetchCategoriesApi } from '../api/endpoints';

const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title must be at most 150 characters'),
  categoryId: z.string().uuid('Please select a category'),
  priority: z.enum(['LOW', 'MEDIUM', 'CRITICAL']),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description must be at most 5000 characters'),
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export function CreateTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategoriesApi,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      priority: 'MEDIUM',
      description: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createTicketApi,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-analytics'] }),
      ]);
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      setServerError(extractApiError(error, 'Failed to submit support ticket.'));
    },
  });

  function onSubmit(values: CreateTicketFormValues): void {
    setServerError(null);
    createMutation.mutate(values);
  }

  return (
    <Row className="justify-content-center">
      <Col lg={8}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1">Create Support Ticket</h1>
            <p className="text-muted mb-0">
              Submit an incident for category-based engineering routing.
            </p>
          </div>
          <Link to="/dashboard" className="btn btn-outline-secondary">
            Back to My Tickets
          </Link>
        </div>

        <Card className="shadow-sm border">
          <Card.Body className="p-4">
            {serverError && <Alert variant="danger">{serverError}</Alert>}
            {categoriesQuery.isError && (
              <Alert variant="danger">
                {extractApiError(categoriesQuery.error, 'Unable to load categories.')}
              </Alert>
            )}

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Form.Group className="mb-3" controlId="ticket-title">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Brief summary of the issue"
                  isInvalid={Boolean(errors.title)}
                  {...register('title')}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.title?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group controlId="ticket-category">
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      disabled={categoriesQuery.isLoading}
                      isInvalid={Boolean(errors.categoryId)}
                      {...register('categoryId')}
                    >
                      <option value="">Select a category</option>
                      {(categoriesQuery.data ?? []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.categoryId?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group controlId="ticket-priority">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select
                      isInvalid={Boolean(errors.priority)}
                      {...register('priority')}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.priority?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4" controlId="ticket-description">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Provide steps to reproduce, workstation ID, or error details..."
                  isInvalid={Boolean(errors.description)}
                  {...register('description')}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.description?.message}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Link to="/dashboard" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <Button
                  type="submit"
                  variant="dark"
                  disabled={createMutation.isPending || categoriesQuery.isLoading}
                >
                  {createMutation.isPending ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
