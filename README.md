# Paseo GitHub issue workflow

Start a Paseo workspace from a GitHub issue. The plugin adds a searchable **GitHub issue** field to New workspace, an **Attach GitHub issue** composer source, and a workspace panel that shows the selected issue and a pull request for its branch.

Selecting an issue on New workspace switches to a worktree, proposes an `issue-<number>-<title>` branch, and stores an issue snapshot on the workspace. When you submit the native New workspace form, the plugin adds the issue title, URL, and description to the first agent's prompt. Paseo creates the workspace and agent through its normal flow. The workspace panel is available from Command Center as **Open GitHub issue**.

## Requirements

- Paseo daemon and app **0.16.0-beta.1 or newer**. This plugin uses the New workspace item and entity metadata APIs introduced in that beta.
- A Git project in Paseo whose `origin` points to `github.com`. HTTPS and SSH remotes are supported.
- Optional: set `GITHUB_TOKEN` in the daemon environment to access private repositories and raise GitHub API limits. Public repositories can work without a token.

During review, install the PR branch on the daemon host:

```sh
paseo plugin install git:508-dev/paseo-issue-workflow
```

The daemon needs Node and npm on its command path. The manifest installs the locked SDK and validation dependencies, including development dependencies required by the current type-import validator, with lifecycle scripts disabled.

Enable plugins in Paseo's plugin settings if the daemon has them disabled. Plugin code is trusted and runs on the daemon host; review the source before installing it.

## Behavior and limits

- The New workspace picker searches the selected project's GitHub repository. Composer attachment search covers GitHub repositories registered as projects on the current host.
- Opening the picker lists recently updated open issues. Search finds open issues by text; entering `#42` or `42` fetches that number directly, including a closed issue. Pull requests are excluded from issue results.
- The issue snapshot stores up to 12,000 characters of the description so the first prompt and attachment remain bounded. The snapshot is persisted as workspace and agent metadata.
- The panel finds a pull request whose head is the workspace's current branch in the same repository owner. It does not discover fork-head pull requests or create a GitHub issue/PR link. The branch and issue reference remain visible even before a pull request exists.
- GitHub Enterprise, Linear, Jira, and Asana are outside this plugin's scope.

## Development

```sh
npm ci --include=dev --legacy-peer-deps --ignore-scripts
npm run typecheck
npm run lint
npm run format:check
npm run test
```

The lockfile pins development dependencies. Git installation and updates run the manifest preparation command before Paseo validates and activates the plugin.
