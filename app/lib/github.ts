const GITHUB_API = "https://api.github.com";

export interface PullRequest {
  title: string;
  url: string;
  repoName: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  statusState: string; // "success" | "failure" | "pending" | "none"
  reviewDecision: string; // "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | ""
  isDraft: boolean;
  number: number;
  branch: string;
}

const SEARCH_QUERY = `
query($query: String!, $cursor: String) {
  search(query: $query, type: ISSUE, first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        title
        url
        number
        isDraft
        headRefName
        createdAt
        updatedAt
        author { login avatarUrl }
        repository { nameWithOwner }
        reviewDecision
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup { state }
            }
          }
        }
      }
    }
  }
}`;

export async function fetchOpenPRs(accessToken: string): Promise<PullRequest[]> {
  // Search for open PRs involving the user
  const queries = [
    "is:open is:pr involves:@me archived:false",
  ];

  const allPRs: PullRequest[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    let cursor: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const resp = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "github-pr-dashboard",
        },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { query: q, cursor },
        }),
      });

      if (!resp.ok) {
        throw new Error(`GitHub API error: ${resp.status}`);
      }

      const json: any = await resp.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      const search = json.data.search;
      for (const node of search.nodes) {
        if (!node.url || seen.has(node.url)) continue;
        seen.add(node.url);

        const statusNode = node.commits?.nodes?.[0]?.commit?.statusCheckRollup;
        allPRs.push({
          title: node.title,
          url: node.url,
          number: node.number,
          repoName: node.repository.nameWithOwner,
          author: node.author?.login || "unknown",
          authorAvatar: node.author?.avatarUrl || "",
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          statusState: statusNode?.state?.toLowerCase() || "none",
          reviewDecision: node.reviewDecision || "",
          isDraft: node.isDraft,
          branch: node.headRefName || "unknown",
        });
      }

      hasNext = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
    }
  }

  // Sort by most recently updated
  allPRs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return allPRs;
}
