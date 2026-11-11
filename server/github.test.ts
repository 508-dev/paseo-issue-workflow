import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import type { Issue } from "../shared/issues";
import {
  issueBranch,
  issuePrompt,
  parseGitHubRemote,
  searchRepositoryIssues,
  readWorkspaceBranch,
  findPullRequest,
} from "./github";

const repository = { owner: "acme", repo: "widget" };

function githubIssue(number: number, overrides: Record<string, unknown> = {}) {
  return {
    number,
    title: "Fix save button",
    body: "Save does nothing on mobile",
    html_url: `https://github.com/acme/widget/issues/${number}`,
    ...overrides,
  };
}

describe("GitHub repository detection", () => {
  it.each([
    "git@github.com:acme/widget.git",
    "https://github.com/acme/widget.git",
    "ssh://git@github.com/acme/widget.git",
    "git://github.com/acme/widget.git",
  ])("reads the owner and repository from %s", (remote) => {
    expect(parseGitHubRemote(remote)).toEqual(repository);
  });

  it("rejects other hosts and extra path segments", () => {
    expect(parseGitHubRemote("git@gitlab.com:acme/widget.git")).toBeNull();
    expect(parseGitHubRemote("https://github.com/acme/widget/extra")).toBeNull();
  });
});

describe("issue search", () => {
  it("filters pull requests from the issue endpoint and caps saved body text", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            githubIssue(42, { body: "x".repeat(15_000) }),
            githubIssue(43, { pull_request: { url: "https://api.github.com/pr/43" } }),
          ]),
          { status: 200 },
        ),
    ) as typeof fetch;
    const issues = await searchRepositoryIssues(repository, "", undefined, fetcher);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      identifier: "acme/widget#42",
      branch: "issue-42-fix-save-button",
      label: "acme/widget#42 Fix save button",
    });
    expect(issues[0].body).toHaveLength(12_000);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/widget/issues?state=open&sort=updated&per_page=20",
      expect.any(Object),
    );
  });

  it("uses the exact issue endpoint for a number", async () => {
    const fetcher = vi.fn(
      async (_url: string) => new Response(JSON.stringify(githubIssue(42)), { status: 200 }),
    );
    const issues = await searchRepositoryIssues(
      repository,
      "#42",
      undefined,
      fetcher as typeof fetch,
    );
    expect(issues[0].number).toBe(42);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/acme/widget/issues/42");
  });

  it("returns no matches for a missing issue while retaining repository access errors", async () => {
    const fetcher = vi.fn(
      async (url: string) =>
        new Response("{}", { status: url.endsWith("/issues/999") ? 404 : 200 }),
    );
    expect(
      await searchRepositoryIssues(repository, "#999", undefined, fetcher as typeof fetch),
    ).toEqual([]);
    const denied = vi.fn(async () => new Response("{}", { status: 404 }));
    await expect(
      searchRepositoryIssues(repository, "#999", undefined, denied as typeof fetch),
    ).rejects.toThrow("repository not found or inaccessible");
  });

  it("reports access failures without leaking credentials", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 403 })) as typeof fetch;
    await expect(searchRepositoryIssues(repository, "", undefined, fetcher)).rejects.toThrow(
      "set GITHUB_TOKEN",
    );
  });
});

describe("first agent context", () => {
  const issue: Issue = {
    id: "acme/widget#42",
    identifier: "acme/widget#42",
    label: "acme/widget#42 Fix save button",
    title: "Fix save button",
    subtitle: "acme/widget",
    url: "https://github.com/acme/widget/issues/42",
    text: "GitHub issue acme/widget#42: Fix save button",
    resourceType: "github-issue",
    owner: "acme",
    repo: "widget",
    number: 42,
    branch: "issue-42-fix-save-button",
    body: "Save does nothing on mobile",
  };

  it("keeps the user's prompt and adds bounded issue context", () => {
    const prompt = issuePrompt(issue, "Implement the requested fix");
    expect(prompt).toContain("Implement the requested fix");
    expect(prompt).toContain("GitHub issue: acme/widget#42");
    expect(prompt).toContain("Save does nothing on mobile");
    expect(prompt).toContain("untrusted task data");
  });

  it("looks up the actual branch even when it differs from the selected issue proposal", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paseo-issue-branch-"));
    try {
      await promisify(execFile)("git", ["init", "--initial-branch=custom-branch", directory]);
      const branch = await readWorkspaceBranch(directory);
      expect(branch).toBe("custom-branch");
      const fetcher = vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                number: 7,
                title: "Fix",
                html_url: "https://github.com/acme/widget/pull/7",
                state: "open",
              },
            ]),
            { status: 200 },
          ),
      );
      expect(await findPullRequest(issue, branch!, undefined, fetcher as typeof fetch)).toEqual({
        number: 7,
        title: "Fix",
        url: "https://github.com/acme/widget/pull/7",
        state: "open",
      });
      expect(fetcher.mock.calls[0]).toEqual([
        expect.stringContaining("head=acme%3Acustom-branch"),
        expect.any(Object),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("generates a predictable branch without unsafe characters", () => {
    expect(issueBranch(42, "Fix: save/button?!")).toBe("issue-42-fix-save-button");
  });
});
