// src/proxy.js
import { NextResponse } from 'next/server'
import {
  COUPANG_SECTION_ENABLED,
  DEALS_SECTION_ENABLED,
  DEFAULT_PUBLIC_LANDING,
  UTILITY_SECTION_ENABLED,
} from '@/lib/siteSections'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  if (!DEALS_SECTION_ENABLED && (pathname === '/hotdeals' || pathname.startsWith('/deal/'))) {
    return NextResponse.redirect(new URL(DEFAULT_PUBLIC_LANDING, request.url))
  }

  if (!COUPANG_SECTION_ENABLED && (pathname === '/coupang' || pathname.startsWith('/coupang/'))) {
    return NextResponse.redirect(new URL(DEFAULT_PUBLIC_LANDING, request.url))
  }

  if (!UTILITY_SECTION_ENABLED && (pathname === '/utility' || pathname.startsWith('/utility/'))) {
    return NextResponse.redirect(new URL(DEFAULT_PUBLIC_LANDING, request.url))
  }

  const hasSession = request.cookies.getAll().some(
    c => c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  const isLoginPage = pathname === '/admin' || pathname === '/admin/'
  const isProtectedPage = pathname.startsWith('/admin/') && !isLoginPage

  if (!hasSession && isProtectedPage) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/admin/:path*', '/hotdeals', '/deal/:path*', '/coupang', '/coupang/:path*', '/utility', '/utility/:path*'],
}
