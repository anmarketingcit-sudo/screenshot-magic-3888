<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Budget pages live under `src/routes/_authenticated/` (client-only gate, redirect to /login); auth pages are public top-level routes — keeps all calculations private.
- Budget state is loaded from Lovable Cloud tables (one per entity, keyed by user_id + id, RLS own-rows) and synced back via diff upserts in `src/lib/budget/sync.ts` — keeps screens working on an in-memory state while persisting across devices.
