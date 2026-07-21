import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { pathForRole } from "@/lib/auth/roles";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const response = NextResponse.redirect(new URL("/login", requestUrl.origin));

  if (!code) return response;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  await supabase.auth.exchangeCodeForSession(code);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const redirectTo = new URL(next || pathForRole(profile?.role), requestUrl.origin);
  response.headers.set("Location", redirectTo.toString());
  return response;
}
