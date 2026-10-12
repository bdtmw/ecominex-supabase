// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = [
  '/dashboard',
  '/Dashboard',
  '/settings',
  "/accountDeatils",
  "/market",
]

const authPaths = [
  '/signIn',
  '/signUp',
  '/about',
  '/demos',
  "/membership",
]

// NOTE: this is only a UX redirect, not a security boundary. The API lives on a
// different origin, so its httpOnly cookie is not visible here. Authorization is
// enforced by the backend on every request.
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  const path = request.nextUrl.pathname

  const isProtectedPath = protectedPaths.some(pp => path.startsWith(pp))
  const isAuthPath = authPaths.some(ap => path.startsWith(ap))

  // If trying to access protected route without token
  if (isProtectedPath && !token) {
    const response = NextResponse.redirect(new URL('/signIn', request.url))
    // Don't delete token here as it might be valid in other tabs
    return response
  }

  // If trying to access auth routes with token
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}