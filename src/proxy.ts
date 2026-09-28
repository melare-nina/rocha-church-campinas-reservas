import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// No Next.js 16 o antigo "middleware.ts" foi renomeado para "proxy.ts"
// (a função exportada também precisa se chamar `proxy`).
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/salas/:path*"],
};
