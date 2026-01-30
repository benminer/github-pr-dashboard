import type { Route } from "./+types/dashboard";
import { redirect, useLoaderData } from "react-router";
import { getSession } from "../lib/session";
import { fetchOpenPRs, type PullRequest } from "../lib/github";

export async function loader({ request }: Route.LoaderArgs) {
  const session = getSession(request);
  if (!session.accessToken) {
    return redirect("/");
  }

  let prs: PullRequest[] = [];
  let error: string | null = null;

  try {
    prs = await fetchOpenPRs(session.accessToken);
  } catch (e: any) {
    error = e.message;
  }

  return {
    user: { login: session.login, avatarUrl: session.avatarUrl },
    prs,
    error,
  };
}

function StatusBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-900/50 text-green-400 border-green-800",
    failure: "bg-red-900/50 text-red-400 border-red-800",
    error: "bg-red-900/50 text-red-400 border-red-800",
    pending: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
    none: "bg-gray-800/50 text-gray-500 border-gray-700",
  };
  const labels: Record<string, string> = {
    success: "✓ Passing",
    failure: "✗ Failing",
    error: "✗ Error",
    pending: "● Pending",
    none: "○ No checks",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[state] || styles.none}`}>
      {labels[state] || state}
    </span>
  );
}

function ReviewBadge({ decision }: { decision: string }) {
  if (!decision) return null;
  const map: Record<string, { style: string; label: string }> = {
    APPROVED: { style: "bg-green-900/50 text-green-400 border-green-800", label: "✓ Approved" },
    CHANGES_REQUESTED: { style: "bg-orange-900/50 text-orange-400 border-orange-800", label: "⟲ Changes requested" },
    REVIEW_REQUIRED: { style: "bg-gray-800/50 text-gray-400 border-gray-700", label: "Review needed" },
  };
  const info = map[decision];
  if (!info) return null;
  return <span className={`text-xs px-2 py-0.5 rounded border ${info.style}`}>{info.label}</span>;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { user, prs, error } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">PR Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="text-sm text-gray-400">{user.login}</span>
          </div>
          <a href="/auth/logout" className="text-sm text-gray-500 hover:text-white transition">
            Sign out
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-gray-300">
            {prs.length} open pull request{prs.length !== 1 ? "s" : ""}
          </h2>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-white transition"
          >
            Refresh
          </a>
        </div>

        {prs.length === 0 && !error && (
          <p className="text-gray-500 text-center py-12">No open PRs found.</p>
        )}

        <div className="space-y-2">
          {prs.map((pr) => (
            <a
              key={pr.url}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-mono">{pr.repoName}</span>
                    <span className="text-xs text-gray-700">#{pr.number}</span>
                    {pr.isDraft && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-medium truncate">{pr.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      {pr.authorAvatar && (
                        <img src={pr.authorAvatar} alt="" className="w-4 h-4 rounded-full" />
                      )}
                      <span className="text-xs text-gray-400">{pr.author}</span>
                    </div>
                    <span className="text-xs text-gray-600">opened {timeAgo(pr.createdAt)}</span>
                    <span className="text-xs text-gray-600">updated {timeAgo(pr.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge state={pr.statusState} />
                  <ReviewBadge decision={pr.reviewDecision} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
