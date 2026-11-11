import { useCallback, useMemo } from "react";
import { useNewWorkspace, useRpc } from "@getpaseo/plugin/client";
import { Combobox } from "@getpaseo/plugin/client/ui";
import { ISSUE_METADATA_KEY, issueSchema, searchIssuesRpc } from "../shared/issues";

export function IssueField() {
  const newWorkspace = useNewWorkspace();
  const searchIssues = useRpc(searchIssuesRpc);
  const stored = issueSchema.safeParse(newWorkspace.metadata[ISSUE_METADATA_KEY]);
  const issue = stored.success ? stored.data : null;
  const value = useMemo(
    () => (issue ? { id: issue.id, label: issue.identifier, description: issue.title } : null),
    [issue?.id, issue?.identifier, issue?.title],
  );
  const search = useCallback(
    async ({ query }: { query: string }) => {
      if (!newWorkspace.project) return [];
      return (await searchIssues({ query, projectId: newWorkspace.project.id })).items;
    },
    [newWorkspace.project, searchIssues],
  );
  return (
    <Combobox
      title="GitHub issue"
      icon="CircleDot"
      value={value}
      search={search}
      onSelect={async ({ item }) => {
        const issue = issueSchema.parse(item);
        await newWorkspace.setIsolation("worktree");
        await newWorkspace.setBranch(issue.branch);
        await newWorkspace.setMetadata({ [ISSUE_METADATA_KEY]: issue });
      }}
      disabled={!newWorkspace.project}
    />
  );
}
