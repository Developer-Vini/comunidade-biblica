import { z } from 'zod';

// Email validation - RFC 5322 simplified
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements: 8+ chars, uppercase, lowercase, number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Sanitization - remove potential XSS
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Registration validation
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(passwordRegex, 'Senha deve ter: letra maiúscula, minúscula e número'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .trim()
});

// Login validation
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
});

// Post creation validation
export const createPostSchema = z.object({
  verse: z
    .string()
    .min(5, 'Versículo deve ter pelo menos 5 caracteres')
    .max(500, 'Versículo deve ter no máximo 500 caracteres'),
  reference: z
    .string()
    .max(100, 'Referência deve ter no máximo 100 caracteres')
    .optional()
    .default(''),
  reflection: z
    .string()
    .min(10, 'Reflexão deve ter pelo menos 10 caracteres')
    .max(2000, 'Reflexão deve ter no máximo 2000 caracteres')
});

// Post update validation
export const updatePostSchema = z.object({
  verse: z
    .string()
    .min(5, 'Versículo deve ter pelo menos 5 caracteres')
    .max(500, 'Versículo deve ter no máximo 500 caracteres')
    .optional(),
  reference: z
    .string()
    .max(100, 'Referência deve ter no máximo 100 caracteres')
    .optional()
    .default(''),
  reflection: z
    .string()
    .min(10, 'Reflexão deve ter pelo menos 10 caracteres')
    .max(2000, 'Reflexão deve ter no máximo 2000 caracteres')
    .optional()
});

// Comment validation
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comentário não pode estar vazio')
    .max(500, 'Comentário deve ter no máximo 500 caracteres')
});

// Profile update validation
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .optional(),
  bio: z
    .string()
    .max(200, 'Bio deve ter no máximo 200 caracteres')
    .optional()
    .default('')
});

// Validate function helper
export const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
};

// Validate and sanitize input
export const validateAndSanitize = (schema, data) => {
  const validation = validate(schema, data);
  if (!validation.success) {
    return validation;
  }

  // Sanitize string fields
  const sanitized = {};
  for (const [key, value] of Object.entries(validation.data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return { success: true, data: sanitized };
};