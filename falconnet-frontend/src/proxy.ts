import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // TODO Phase 2: Enable auth protection once login flow is fully wired.
  // Uncomment the block below when the backend auth is integrated.
  //
  // const token = request.cookies.get('fn_token')?.value;
  // const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  //
  // if (!token && !isPublic) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }
  // if (token && isPublic) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip:
     *  - _next/static  (static files)
     *  - _next/image   (image optimization)
     *  - favicon.ico
     *  - *.png, *.svg  (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)',
  ],
};
