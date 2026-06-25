# Claude Rules for this project

## Default Platform
- This project has both a mobile app (`mobile/`) and a web app (Next.js root).
- ALWAYS assume we are talking about the mobile app (React Native / Expo) unless the user explicitly mentions the web app.
- Do not ask for clarification or check the web app code unless the user clearly says "web app", "Next.js", "browser", or refers to a web-specific file/route.

## Git
- Never run `git commit` or `git push` without explicit instruction from the user.
- Always wait to be told "commit" or "push" before doing so.
