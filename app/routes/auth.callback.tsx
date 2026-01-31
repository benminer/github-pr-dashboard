import type { Route } from "./+types/auth.callback";
import { redirect } from "react-router";
import { setSessionCookie } from "../lib/session";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/?error=no_code");
  }

  // Exchange code for access token
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData: any = await tokenResp.json();
  if (!tokenData.access_token) {
    return redirect("/?error=token_failed");
  }

  // Get user info
  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "github-pr-dashboard",
    },
  });
  const user: any = await userResp.json();

  const cookie = setSessionCookie({
    accessToken: tokenData.access_token,
    login: user.login,
    avatarUrl: user.avatar_url,
  });

  return redirect("/dashboard", {
    headers: { "Set-Cookie": cookie },
  });
}
