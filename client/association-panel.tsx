import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useRpc, type PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { associationRpc, type Issue } from "../shared/issues";

type Association = {
  issue: Issue | null;
  pullRequest: { number: number; title: string; url: string; state: string } | null;
  pullRequestError: string | null;
};

export function AssociationPanel({ workspaceId, theme, layout }: PluginWorkspacePanelProps) {
  const resolve = useRpc(associationRpc);
  const [association, setAssociation] = useState<Association | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void resolve({ workspaceId })
      .then((result) => {
        if (active) setAssociation(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [resolve, workspaceId]);

  const foreground = { color: theme.colors.foreground };
  const muted = { color: theme.colors.foregroundMuted };
  const container = {
    flex: 1,
    gap: 16,
    padding: layout.compact ? 16 : 24,
    backgroundColor: theme.colors.surface0,
  };
  return (
    <View style={container}>
      <Text style={[foreground, { fontSize: 20, fontWeight: "600" }]}>GitHub issue</Text>
      {error ? <Text style={muted}>{error}</Text> : null}
      {!association && !error ? <Text style={muted}>Loading…</Text> : null}
      {association && !association.issue ? (
        <Text style={muted}>No GitHub issue is linked to this workspace.</Text>
      ) : null}
      {association?.issue ? (
        <View style={{ gap: 8 }}>
          <Text style={foreground}>
            {association.issue.identifier}: {association.issue.title}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(association.issue!.url)}
          >
            <Text style={{ color: theme.colors.accent }}>{association.issue.url}</Text>
          </Pressable>
          <Text style={muted}>Branch: {association.issue.branch}</Text>
        </View>
      ) : null}
      {association?.issue ? (
        <View style={{ gap: 8 }}>
          <Text style={[foreground, { fontSize: 17, fontWeight: "600" }]}>Pull request</Text>
          {association.pullRequest ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(association.pullRequest!.url)}
            >
              <Text style={{ color: theme.colors.accent }}>
                #{association.pullRequest.number} {association.pullRequest.title} (
                {association.pullRequest.state})
              </Text>
            </Pressable>
          ) : association.pullRequestError ? (
            <Text style={muted}>{association.pullRequestError}</Text>
          ) : (
            <Text style={muted}>No pull request found for this branch.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
