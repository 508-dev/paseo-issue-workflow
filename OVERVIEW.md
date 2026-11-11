# GitHub issue workflow

Choose a GitHub issue when creating a Paseo workspace. Paseo starts a worktree on an issue branch and the first agent receives the issue title, URL, and description with your prompt. You can also attach issues to later prompts and open a workspace panel with the issue and a matching pull request.

Requires Paseo 0.16.0-beta.1 or newer on the daemon and app, Node and npm for Git preparation, and a Paseo Git project with a `github.com` origin. Preparation installs locked SDK and validation dependencies with lifecycle scripts disabled. Public issues work without credentials. Set `GITHUB_TOKEN` on the daemon for private repositories and higher API limits. The plugin reads Git remotes for registered projects, queries the GitHub API, and stores a bounded issue snapshot in workspace and agent metadata.

The pull request lookup matches the current workspace branch in the same repository owner. It does not create or close issues or pull requests. GitHub Enterprise and other issue trackers are not supported.
