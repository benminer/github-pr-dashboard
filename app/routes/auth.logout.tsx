import { redirect } from "react-router";
import { clearSessionCookie } from "../lib/session";

export function loader() {
  return redirect("/", {
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}
