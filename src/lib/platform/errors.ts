import { NextResponse } from 'next/server';
import { handleAuthError } from '@/lib/auth-helpers';
import type { FieldError } from './types';

export class ValidationError extends Error {
  status = 400;
  errors: FieldError[];
  constructor(errors: FieldError[]) {
    super(errors.map((e) => e.message).join('; ') || 'Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/** Convert platform/auth errors into JSON responses. Unknown errors are logged and return 500. */
export function platformErrorResponse(error: unknown, logLabel = 'Platform error'): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, errors: error.errors, code: 'VALIDATION' }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  // Mongo duplicate key
  if (error && typeof error === 'object' && (error as { code?: number }).code === 11000) {
    return NextResponse.json({ error: 'A record with that name/API name already exists.' }, { status: 409 });
  }
  const res = handleAuthError(error);
  if (res.status === 500) console.error(logLabel, error);
  return res;
}
