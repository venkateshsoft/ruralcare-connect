# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty scaffold. As implementation begins, keep the layout predictable:

- `src/` - application source and reusable modules.
- `tests/` - automated tests, mirroring the relevant `src/` paths.
- `assets/` - checked-in static assets such as images, fixtures, and seed data.
- `docs/` - design notes and contributor-facing documentation.

Group code by feature or domain. Keep generated output, local environment files, and dependency caches out of version control.

## Build, Test, and Development Commands

No project commands are defined yet. Once a toolchain is selected, document the canonical commands here and in the README:

```text
<package-manager> install       # install dependencies
<package-manager> run dev       # start the local development server
<package-manager> run build     # create a production build
<package-manager> test          # run the automated test suite
```

Run commands from the repository root.

## Coding Style & Naming Conventions

Use the adopted formatter and linter; run both locally and in CI. Use two spaces for JSON/YAML and the selected language's standard formatter. Name directories and modules with lowercase `kebab-case`. Keep functions small and favor explicit interfaces at module boundaries.

## Testing Guidelines

Add tests under `tests/` (or the framework's conventional location) and mirror source paths where practical. Name tests after the behavior they verify, for example `tests/auth/login.spec.*`. Every new feature and bug fix should include a focused regression test. Record the chosen framework, coverage threshold, and exact test command when the test stack is introduced.

## Commit & Pull Request Guidelines

There is no Git history yet, so no repository-specific commit convention can be inferred. Use imperative, concise subjects (for example, `Add patient intake form`) and keep each commit focused. Pull requests should explain the change, include validation steps and test results, link related issues, and attach screenshots or recordings for user-facing changes. Call out configuration, migration, or security implications explicitly.

## Security & Configuration

Never commit credentials, personal health information, production data, or local `.env` files. Provide a sanitized `.env.example` when configuration is required, document required variables, and validate input at external boundaries. Treat any healthcare-related data as sensitive and use synthetic fixtures in development and tests.
