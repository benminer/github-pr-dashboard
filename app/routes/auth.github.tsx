import type { Route } from "./+types/auth.github";
import { redirect } from "react-router";

export function loader({ request }: Route.LoaderArgs) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const scope = "read:org repo";
  const state = crypto.randomUUID();

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId!);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return redirect(url.toString());
}
