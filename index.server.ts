import type { PluginServerContext } from "@getpaseo/plugin/server";
import { associationRpc, ISSUE_METADATA_KEY, issueSchema, searchIssuesRpc } from "./shared/issues";
import {
  findPullRequest,
  issuePrompt,
  projectRepositories,
  searchRepositoryIssues,
} from "./server/github";

export default function contribute(server: PluginServerContext) {
  server.handle(searchIssuesRpc, async ({ query, projectId }, { paseo }) => {
    const repositories = await projectRepositories(paseo, projectId);
    const results = await Promise.allSettled(
      repositories.map((repo) => searchRepositoryIssues(repo, query)),
    );
    const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    if (items.length === 0 && results.every((result) => result.status === "rejected")) {
      throw results[0].status === "rejected" ? results[0].reason : new Error("Issue search failed");
    }
    return { items: items.slice(0, 30) };
  });

  server.handle(associationRpc, async ({ workspaceId }, { paseo }) => {
    const workspace = await paseo.workspaces.ref(workspaceId).refresh();
    const parsed = issueSchema.safeParse(workspace?.metadata?.[ISSUE_METADATA_KEY]);
    if (!parsed.success) return { issue: null, pullRequest: null, pullRequestError: null };
    const issue = parsed.data;
    if (!workspace?.workspaceDirectory) return { issue, pullRequest: null, pullRequestError: null };
    try {
      return {
        issue,
        pullRequest: await findPullRequest(issue, workspace.workspaceDirectory),
        pullRequestError: null,
      };
    } catch (error) {
      return {
        issue,
        pullRequest: null,
        pullRequestError: error instanceof Error ? error.message : "Pull request lookup failed",
      };
    }
  });

  server.addHook("workspace.create.before", async ({ request }) => {
    const parsed = issueSchema.safeParse(request.metadata?.[ISSUE_METADATA_KEY]);
    if (!parsed.success || !request.agent) return;
    return {
      ...request,
      agent: {
        ...request.agent,
        initialPrompt: issuePrompt(parsed.data, request.agent.initialPrompt ?? ""),
        metadata: { ...request.agent.metadata, [ISSUE_METADATA_KEY]: parsed.data },
      },
    };
  });

  return () => {};
}
