import type { PluginClientContext } from "@getpaseo/plugin/client";
import { AssociationPanel } from "./client/association-panel";
import { IssueField } from "./client/issue-field";
import { issueAttachments } from "./shared/issues";

export default function contribute(client: PluginClientContext) {
  client.addNewWorkspaceItem({ id: "github-issue", Component: IssueField });
  client.addAttachmentSource(issueAttachments);
  client.addWorkspacePanel({
    id: "github-issue",
    title: "GitHub issue",
    icon: "CircleDot",
    Component: AssociationPanel,
  });
  client.addCommandCenterItem({
    id: "open-github-issue",
    title: "Open GitHub issue",
    icon: "CircleDot",
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("github-issue");
    },
  });
  return () => {};
}
