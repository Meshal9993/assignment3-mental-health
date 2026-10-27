# Commands for this laptop

The default shell had Python 3.9.6 but no Node or npm on PATH. Setup used the
Codex bundled Python 3.12.14 and Node 24.19.0. No global software was installed.
For a new terminal on this laptop, run from the project root:

```sh
export PATH="/Users/alqufaidi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/alqufaidi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
```

The existing `backend/.venv` is ready. If recreating it on this laptop:

```sh
/Users/alqufaidi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
pnpm --dir frontend install --frozen-lockfile
```

Then use the two server commands in the README. A different laptop should use
its own standard Python/Node installation instead of these absolute paths.
