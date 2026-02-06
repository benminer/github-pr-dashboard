import type { Route } from "./+types/dashboard";
import { redirect, useLoaderData } from "react-router";
import { getSession } from "../lib/session";
import { fetchOpenPRs, type PullRequest } from "../lib/github";
import { useState, useEffect, useMemo } from "react";

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

  // State management with localStorage persistence
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"activity" | "org">("activity");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [toast, setToast] = useState<string | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedSortMode = localStorage.getItem("pr-dashboard-sort-mode");
    const savedSortDirection = localStorage.getItem("pr-dashboard-sort-direction");
    if (savedSortMode === "activity" || savedSortMode === "org") {
      setSortMode(savedSortMode);
    }
    if (savedSortDirection === "desc" || savedSortDirection === "asc") {
      setSortDirection(savedSortDirection);
    }
  }, []);

  // Save preferences to localStorage when changed
  useEffect(() => {
    localStorage.setItem("pr-dashboard-sort-mode", sortMode);
  }, [sortMode]);

  useEffect(() => {
    localStorage.setItem("pr-dashboard-sort-direction", sortDirection);
  }, [sortDirection]);

  // Auto-dismiss toast after 2.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Copy branch name to clipboard
  const copyBranch = (branch: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(branch);
    setToast(`Copied: ${branch}`);
  };

  // Filter PRs by search query
  const filteredPRs = useMemo(() => {
    if (!searchQuery.trim()) return prs;
    const q = searchQuery.toLowerCase();
    return prs.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.repoName.toLowerCase().includes(q) ||
        pr.author.toLowerCase().includes(q)
    );
  }, [prs, searchQuery]);

  // Sort filtered PRs
  const sortedPRs = useMemo(() => {
    const sorted = [...filteredPRs];
    
    if (sortMode === "org") {
      sorted.sort((a, b) => {
        const orgA = a.repoName.split("/")[0];
        const orgB = b.repoName.split("/")[0];
        const orgCmp = orgA.localeCompare(orgB);
        if (orgCmp !== 0) return orgCmp;
        // Within same org, sort by most recent activity
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } else {
      // Activity mode
      sorted.sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
      });
    }
    
    return sorted;
  }, [filteredPRs, sortMode, sortDirection]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
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
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by title, repo, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-gray-600 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            )}
          </div>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-white transition px-3 py-2 border border-gray-800 rounded-lg"
          >
            Refresh
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Sort controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg text-gray-300">
            {searchQuery ? (
              <>
                {sortedPRs.length} of {prs.length} PR{prs.length !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {prs.length} open pull request{prs.length !== 1 ? "s" : ""}
              </>
            )}
          </h2>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">Sort by:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "activity" | "org")}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-gray-600 transition"
            >
              <option value="activity">Last Activity</option>
              <option value="org">Organization</option>
            </select>

            {sortMode === "activity" && (
              <button
                onClick={() => setSortDirection((d) => (d === "desc" ? "asc" : "desc"))}
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition flex items-center gap-1.5"
              >
                {sortDirection === "desc" ? "↓ Newest" : "↑ Oldest"}
              </button>
            )}
          </div>
        </div>

        {sortedPRs.length === 0 && !error && (
          <p className="text-gray-500 text-center py-12">
            {searchQuery ? "No PRs match your search." : "No open PRs found."}
          </p>
        )}

        <div className="space-y-2">
          {sortedPRs.map((pr) => (
            <a
              key={pr.url}
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-gray-500 font-mono">{pr.repoName}</span>
                    <span className="text-xs text-gray-700">#{pr.number}</span>
                    {pr.isDraft && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">
                        Draft
                      </span>
                    )}
                    <button
                      onClick={(e) => copyBranch(pr.branch, e)}
                      className="text-xs text-gray-600 hover:text-white transition flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-800"
                      title="Copy branch name"
                    >
                      <span className="font-mono">{pr.branch}</span>
                      <span>📋</span>
                    </button>
                  </div>
                  <h3 className="text-white font-medium">{pr.title}</h3>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-900 text-green-100 px-4 py-3 rounded-lg shadow-lg border border-green-800 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
