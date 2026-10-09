
export const swaggerDocument = {
  openapi: '3.0.3',

  info: {
    title: 'API de Árbol Genealógico',
    version: '1.0.0',
    description:
      'API REST para gestionar personas y consultar relaciones familiares hasta el segundo grado de consanguinidad.'
  },

  servers: [
    {
      url: '/api/personas',
      description: 'API del servidor actual'
    }
  ],

  tags: [
    {
      name: 'Personas',
      description: 'Operaciones CRUD para personas del árbol genealógico'
    },
    {
      name: 'Familia',
      description: 'Consulta de familiares y grados de consanguinidad'
    },
    {
      name: 'Sistema',
      description: 'Estado del servidor y conexión a la base de datos'
    }
  ],

  components: {
    schemas: {
      PersonaEntrada: {
        type: 'object',
        required: ['nombres', 'apellidos'],
        properties: {
          nombres: {
            type: 'string',
            example: 'María'
          },
          apellidos: {
            type: 'string',
            example: 'Martínez López'
          },
          fechaNacimiento: {
            type: 'string',
            format: 'date',
            nullable: true,
            example: '1980-05-15'
          },
          sexo: {
            type: 'string',
            enum: ['masculino', 'femenino', 'otro'],
            default: 'otro'
          },
          padre: {
            type: 'string',
            nullable: true,
            description: 'Identificador MongoDB del padre',
            example: '507f1f77bcf86cd799439011'
          },
          madre: {
            type: 'string',
            nullable: true,
            description: 'Identificador MongoDB de la madre',
            example: '507f1f77bcf86cd799439012'
          }
        }
      },

      Persona: {
        allOf: [
          { $ref: '#/components/schemas/PersonaEntrada' },
          {
            type: 'object',
            properties: {
              _id: {
                type: 'string',
                example: '507f1f77bcf86cd799439013'
              },
              createdAt: {
                type: 'string',
                format: 'date-time'
              },
              updatedAt: {
                type: 'string',
                format: 'date-time'
              }
            }
          }
        ]
      },

      Error: {
        type: 'object',
        properties: {
          mensaje: {
            type: 'string',
            example: 'Persona no encontrada'
          }
        }
      }
    }
  },

  paths: {
    '/': {
      get: {
        tags: ['Personas'],
        summary: 'Listar todas las personas',
        description:
          'Obtiene el listado de personas registradas en el árbol genealógico.',
        responses: {
          200: {
            description: 'Listado de personas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Persona' }
                }
              }
            }
          },
          500: { description: 'Error interno del servidor' }
        }
      },

      post: {
        tags: ['Personas'],
        summary: 'Registrar una persona',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PersonaEntrada' }
            }
          }
        },
        responses: {
          201: { description: 'Persona creada correctamente' },
          400: { description: 'Datos inválidos' },
          500: { description: 'Error interno del servidor' }
        }
      }
    },

    '/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Identificador MongoDB de la persona',
          schema: { type: 'string' },
          example: '507f1f77bcf86cd799439013'
        }
      ],

      get: {
        tags: ['Personas'],
        summary: 'Consultar una persona',
        responses: {
          200: {
            description: 'Persona encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Persona' }
              }
            }
          },
          400: { description: 'Identificador inválido' },
          404: { description: 'Persona no encontrada' }
        }
      },

      put: {
        tags: ['Personas'],
        summary: 'Actualizar una persona',
        description: 'Actualiza los datos de una persona existente.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PersonaEntrada' }
            }
          }
        },
        responses: {
          200: { description: 'Persona actualizada' },
          400: { description: 'Datos o identificador inválidos' },
          404: { description: 'Persona no encontrada' }
        }
      },

      patch: {
        tags: ['Personas'],
        summary: 'Actualizar una persona',
        description:
          'Endpoint disponible en el código. Verifica si el controlador permite actualizaciones parciales.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PersonaEntrada' }
            }
          }
        },
        responses: {
          200: { description: 'Persona actualizada' },
          400: { description: 'Datos inválidos' },
          404: { description: 'Persona no encontrada' }
        }
      },

      delete: {
        tags: ['Personas'],
        summary: 'Eliminar una persona',
        description:
          'Elimina una persona. Verifica en el controlador cómo se manejan las referencias familiares.',
        responses: {
          200: { description: 'Persona eliminada' },
          400: { description: 'Identificador inválido' },
          404: { description: 'Persona no encontrada' }
        }
      }
    },

    '/{id}/familia': {
      get: {
        tags: ['Familia'],
        summary: 'Consultar el árbol familiar',
        description:
          'Consulta padres, hijos, hermanos, abuelos y nietos registrados para una persona.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Identificador MongoDB de la persona',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Información familiar encontrada'
          },
          400: { description: 'Identificador inválido' },
          404: { description: 'Persona no encontrada' }
        }
      }
    }
  }
};