# Claude Instructions

## Default Platform
- This project has both a mobile app (`mobile/`) and a web app (Next.js root).
- ALWAYS assume we are talking about the mobile app (React Native / Expo) unless the user explicitly mentions the web app.
- Do not ask for clarification or check the web app code unless the user clearly says "web app", "Next.js", "browser", or refers to a web-specific file/route.

## Rules (not roses)

- Don't use fire-and-forget for important async operations (like emails). Always `await` and log the result.
- Don't check git push permission implicitly — always ask before pushing.
- Never commit unless the user explicitly says to commit. Do not ask if they want to commit after finishing a task. Wait for them to say "commit" or "now commit".
- When checking which user triggered something, match against `user.email`, not `user.username`.
- Don't over-explain or narrate what you're doing. Be short.
- Don't repeat the same instruction back to me. Just do it.
- Don't create unnecessary files or comments.
- When updating the roadmap, always update BOTH `ROADMAP.md` AND `ROADMAP - TRELLO.txt` to keep them in sync.

## Deployment

- Hosting: AWS Amplify. Push to `main` and manually trigger deploy:
  ```
  aws amplify start-job --app-id d1fv3pyedpdjxn --branch-name main --job-type RELEASE --region eu-west-2
  ```

## Stack

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Auth: AWS Cognito (`USER_PASSWORD_AUTH`)
- DB: RDS PostgreSQL, pool in `lib/db.ts`
- Email: Resend (`RESEND_API_KEY` in `.env.local`)
- State: Redux Toolkit
