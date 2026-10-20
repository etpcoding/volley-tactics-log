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

- Team rosters use the shared `teamPlayers` filter; a selected empty team must never fall back to other teams' players, to keep match attribution correct.
- Shared interface styling lives in semantic tokens and shared utilities in src/styles.css; the root shell provides desktop navigation and mobile bottom navigation so modules remain visually consistent.
