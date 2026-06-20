// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/', '/profile/:path*', '/admin/:path*', '/testing', '/html', '/testing/:path*', '/html/:path*'],
}
