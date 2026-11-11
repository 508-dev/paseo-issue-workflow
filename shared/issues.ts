import { defineAttachmentSource, defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const issueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  label: z.string(),
  title: z.string(),
  subtitle: z.string(),
  url: z.url(),
  text: z.string(),
  resourceType: z.literal("github-issue"),
  owner: z.string(),
  repo: z.string(),
  number: z.number().int().positive(),
  branch: z.string(),
  body: z.string(),
});

export type Issue = z.infer<typeof issueSchema>;

export const searchIssuesRpc = defineRpc({
  name: "github_issues.search",
  input: z.object({ query: z.string().max(200), projectId: z.string().optional() }),
  output: z.object({ items: z.array(issueSchema) }),
});

export const issueAttachments = defineAttachmentSource({
  id: "github-issues",
  title: "GitHub issue",
  icon: "CircleDot",
  pickerTitle: "Attach GitHub issue",
  searchPlaceholder: "Search issues by number or title",
  search: searchIssuesRpc,
});

export const ISSUE_METADATA_KEY = "github-issue-workflow.issue";

export const associationRpc = defineRpc({
  name: "github_issues.association",
  input: z.object({ workspaceId: z.string() }),
  output: z.object({
    issue: issueSchema.nullable(),
    branch: z.string().nullable(),
    pullRequest: z
      .object({
        number: z.number().int().positive(),
        title: z.string(),
        url: z.url(),
        state: z.string(),
      })
      .nullable(),
    pullRequestError: z.string().nullable(),
  }),
});
