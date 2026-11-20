import { NextResponse } from 'next/server';

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
}
