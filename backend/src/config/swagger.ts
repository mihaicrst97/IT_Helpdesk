const errorResponseRef = { $ref: '#/components/schemas/ErrorResponse' };

export const swaggerSpec: Record<string, unknown> = {
  openapi: '3.0.3',
  info: {
    title: 'IT Helpdesk API',
    version: '1.0.0',
    description:
      'REST API for the event-driven IT Helpdesk & Incident Management System with JWT authentication and strict Category-Based Access Control (CBAC).',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          details: {},
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['status', 'database', 'timestamp'],
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', example: 'connected' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      CertificationSummary: {
        type: 'object',
        required: ['id', 'name', 'certifiedAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'HARDWARE' },
          certifiedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'email', 'fullName', 'role'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
      SafeUser: {
        type: 'object',
        required: ['id', 'email', 'fullName', 'role', 'createdAt', 'certifications'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
          certifications: {
            type: 'array',
            items: { $ref: '#/components/schemas/CertificationSummary' },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/SafeUser' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'employee@helpdesk.local' },
          password: { type: 'string', minLength: 8, example: 'Password123!' },
          fullName: { type: 'string', minLength: 2, example: 'Sam Employee' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@helpdesk.local' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      Category: {
        type: 'object',
        required: ['id', 'name', 'discordChannelKey'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'HARDWARE' },
          discordChannelKey: { type: 'string', example: 'DISCORD_WEBHOOK_HW' },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'content', 'ticketId', 'authorId', 'createdAt', 'author'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          ticketId: { type: 'string', format: 'uuid' },
          authorId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          author: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      Ticket: {
        type: 'object',
        required: [
          'id',
          'title',
          'description',
          'status',
          'priority',
          'categoryId',
          'authorId',
          'createdAt',
          'updatedAt',
          'category',
          'author',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'CRITICAL'] },
          categoryId: { type: 'string', format: 'uuid' },
          authorId: { type: 'string', format: 'uuid' },
          assignedAdminId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          category: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
          author: { $ref: '#/components/schemas/UserSummary' },
          assignedAdmin: {
            allOf: [{ $ref: '#/components/schemas/UserSummary' }],
            nullable: true,
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'limit', 'total', 'totalPages'],
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      CreateTicketRequest: {
        type: 'object',
        required: ['title', 'description', 'priority', 'categoryId'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 150 },
          description: { type: 'string', minLength: 5, maxLength: 5000 },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'CRITICAL'] },
          categoryId: { type: 'string', format: 'uuid' },
        },
      },
      UpdateTicketStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] },
        },
      },
      CreateCommentRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
      AdminAnalyticsResponse: {
        type: 'object',
        required: ['certifications', 'totalTickets', 'byCategory', 'byPriority', 'byStatus'],
        properties: {
          certifications: {
            type: 'array',
            items: { $ref: '#/components/schemas/CertificationSummary' },
          },
          totalTickets: { type: 'integer' },
          byCategory: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                categoryId: { type: 'string', format: 'uuid' },
                categoryName: { type: 'string' },
                count: { type: 'integer' },
              },
            },
          },
          byPriority: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'CRITICAL'] },
                count: { type: 'integer' },
              },
            },
          },
          byStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] },
                count: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Check API and PostgreSQL database readiness',
        responses: {
          '200': {
            description: 'Service and database are healthy',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
          '503': {
            description: 'Database connection unavailable',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new standard user account',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'User created and JWT issued',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '409': {
            description: 'Email already registered',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user or admin and issue JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Authentication succeeded',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return current authenticated user profile and active certifications',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/SafeUser' } },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all support categories from PostgreSQL',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Ordered list of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    categories: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/tickets': {
      post: {
        tags: ['Tickets'],
        summary: 'Create a categorized support ticket',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateTicketRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Ticket created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ticket: { $ref: '#/components/schemas/Ticket' } },
                },
              },
            },
          },
          '400': {
            description: 'Validation or category error',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
      get: {
        tags: ['Tickets'],
        summary: 'List paginated tickets submitted by the authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] },
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'CRITICAL'] },
          },
          { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Paginated user tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tickets: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket details and comment thread (owner or certified admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Ticket details with chronological comments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ticket: { $ref: '#/components/schemas/Ticket' } },
                },
              },
            },
          },
          '403': {
            description: 'Access denied or missing category certification',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '404': {
            description: 'Ticket not found',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/tickets/{id}/status': {
      patch: {
        tags: ['Tickets'],
        summary: 'Update ticket status (certified admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTicketStatusRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ticket status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ticket: { $ref: '#/components/schemas/Ticket' } },
                },
              },
            },
          },
          '403': {
            description: 'Insufficient role or missing category certification',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '404': {
            description: 'Ticket not found',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/tickets/{id}/comments': {
      post: {
        tags: ['Tickets'],
        summary: 'Add a comment to a ticket (owner or certified admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateCommentRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Comment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { comment: { $ref: '#/components/schemas/Comment' } },
                },
              },
            },
          },
          '403': {
            description: 'Access denied or missing category certification',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '404': {
            description: 'Ticket not found',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/admin/tickets': {
      get: {
        tags: ['Admin'],
        summary: 'List paginated tickets strictly filtered by admin certifications (CBAC)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] },
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'CRITICAL'] },
          },
          { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Certification-filtered tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tickets: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '403': {
            description: 'Admin role required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
    '/api/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get ticket analytics and active certifications scoped to the admin',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Scoped admin analytics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminAnalyticsResponse' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
          '403': {
            description: 'Admin role required',
            content: { 'application/json': { schema: errorResponseRef } },
          },
        },
      },
    },
  },
};
