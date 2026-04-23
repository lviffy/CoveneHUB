import { NextResponse } from 'next/server';

// Root API endpoint - health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'CONVENEHUB Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        signout: 'POST /api/auth/signout',
        verifyotp: 'POST /api/auth/verifyotp'
      },
      admin: {
        users: 'GET/POST /api/admin/users',
        updateRole: 'PUT /api/admin/users/[id]/role'
      }
    }
  });
}
