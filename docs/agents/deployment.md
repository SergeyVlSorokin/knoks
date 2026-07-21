# Deployment and Code Submission Procedure

This document outlines the correct process for verify, submit, and deploy actions in this repository. All agents must follow this procedure to comply with branch protection policies and ensure clean git history.

## 1. Local Verification

Before creating a pull request, verify that the application compiles and passes all acceptance tests locally:

1. **Typecheck:** Run `npx tsc --noEmit`.
2. **Database:** Ensure Docker container is running: `docker compose up -d --wait`.
3. **Tests:** Run the Playwright acceptance test suite: `npx playwright test`.

## 2. Branch Management

The `master` branch is protected and does not allow merge commits or direct pushes.

1. **Checkout clean branch:** Always create a new feature branch originating from the latest `origin/master`:
   ```bash
   git checkout -b feature/your-feature-name origin/master
   ```
2. **Commit clean changes:** Keep your branch clean by only committing the specific changes needed for your task.

## 3. Pull Request Submission

Pull requests must be created and merged using the GitHub CLI (`gh`).

1. **Switch CLI active user:** Ensure `gh` is authenticated and configured to use the repository owner `SergeyVlSorokin`:
   ```bash
   gh auth switch --hostname github.com --user SergeyVlSorokin
   ```
2. **Push feature branch:** Push the feature branch to origin:
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Create PR:** Create a pull request:
   ```bash
   gh pr create --title "feat: descriptive title" --body "Detailed description of the change"
   ```

## 4. Status Checks and Merging

1. **Monitor status checks:** Wait for the `Verify application` GitHub Action to pass:
   ```bash
   gh pr checks
   ```
2. **Merge via Rebase:** Once checks pass, merge the PR using the rebase strategy to avoid merge commits:
   ```bash
   gh pr merge --rebase --delete-branch
   ```
3. **Automatic Deployment:** Merging to the remote `master` branch triggers the GitHub Actions continuous delivery workflow. It automatically applies database migrations to the Neon production database and deploys the application to Vercel.
4. **Sync local master:** After merging, switch back to your local `master` branch and align it:
   ```bash
   git checkout master
   git fetch origin
   git reset --hard origin/master
   ```
