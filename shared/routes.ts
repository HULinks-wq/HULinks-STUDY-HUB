import { z } from 'zod';
import { insertCourseSchema, insertQuizSchema, insertAssignmentSchema, insertCalculatorLogSchema, courses, quizzes, assignments, calculatorLogs, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    user: {
      method: 'GET' as const,
      path: '/api/auth/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  courses: {
    list: {
      method: 'GET' as const,
      path: '/api/courses' as const,
      responses: {
        200: z.array(z.custom<typeof courses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/courses' as const,
      input: insertCourseSchema,
      responses: {
        201: z.custom<typeof courses.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  quizzes: {
    list: {
      method: 'GET' as const,
      path: '/api/quizzes' as const,
      responses: {
        200: z.array(z.custom<typeof quizzes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/quizzes/:id' as const,
      responses: {
        200: z.custom<typeof quizzes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/quizzes/generate' as const,
      input: z.object({
        courseId: z.number(),
        topic: z.string(),
        isTest: z.boolean(),
        questionCount: z.number().min(1).max(100),
        questionTypes: z.array(z.enum(["mcq", "truefalse", "discussion", "define", "scenario", "essay", "calculation"])).min(1),
        enableTimer: z.boolean().default(false),
      }),
      responses: {
        201: z.custom<typeof quizzes.$inferSelect>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    }
  },
  assignments: {
    list: {
      method: 'GET' as const,
      path: '/api/assignments' as const,
      responses: {
        200: z.array(z.custom<typeof assignments.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/assignments/:id' as const,
      responses: {
        200: z.custom<typeof assignments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/assignments' as const,
      input: z.object({
        title: z.string(),
        content: z.string(),
      }),
      responses: {
        201: z.custom<typeof assignments.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    generateFeedback: {
      method: 'POST' as const,
      path: '/api/assignments/:id/feedback' as const,
      responses: {
        200: z.custom<typeof assignments.$inferSelect>(),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      }
    }
  },
  calculator: {
    solve: {
      method: 'POST' as const,
      path: '/api/calculator/solve' as const,
      input: z.object({
        equation: z.string(),
      }),
      responses: {
        200: z.custom<typeof calculatorLogs.$inferSelect>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    },
    history: {
      method: 'GET' as const,
      path: '/api/calculator/history' as const,
      responses: {
        200: z.array(z.custom<typeof calculatorLogs.$inferSelect>()),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
