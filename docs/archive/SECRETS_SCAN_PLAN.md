# SECRETS_SCAN_PLAN.md

**Created**: 2026-01-28  
**Status**: ⏸️ AWAITING APPROVAL BEFORE EXECUTION

---

## SITUATION

Git history shows recent refactoring of secrets management:
- `e6019ff` - "chore(env): centralize env access, add secrets migration plan"
- `fe890f8` - "chore(env): add missing env vars (OPENAI, ENCRYPTION, GOOGLE_OAUTH)"
- `808540c` - "refactor(auth): read JWT_SECRET from centralized env.ts"

This suggests secrets MAY have been committed before the refactoring.

---

## SCAN COMMANDS (DO NOT RUN WITHOUT APPROVAL)

```bash
# 1. Search for common secret patterns
git log -p --all | grep -E 'AIRTABLE_API_KEY|JWT_SECRET|ENCRYPTION_MASTER_KEY|pat\.' | head -100

# 2. Search for .env files in history
git log --all --full-history -- .env

# 3. Use gitleaks (if available)
gitleaks detect --source . --report-path gitleaks-report.json

# 4. Check specific commits around refactoring
git show e6019ff
git show fe890f8
git show 808540c
```

---

## IF SECRETS FOUND - ACTION PLAN

### IMMEDIATE (Within 1 hour):
1. **Rotate ALL potentially exposed secrets** in Vercel dashboard:
   - AIRTABLE_API_KEY
   - JWT_SECRET
   - ENCRYPTION_MASTER_KEY
   - GITHUB_TOKEN
   - OPENAI_API_KEY
   - GOOGLE_OAUTH_CLIENT_ID
   - GOOGLE_OAUTH_CLIENT_SECRET

2. **Document rotation** in `SECRETS_ROTATION_LOG.md`

3. **Notify team** via email/Slack

### WITHIN 24 HOURS:
4. **Git history cleanup** (if repo is private, lower priority):
   ```bash
   # Option A: BFG Repo Cleaner (recommended)
   brew install bfg
   bfg --replace-text secrets-to-remove.txt .git
   
   # Option B: git filter-repo
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   
   # Force push (coordinate with team!)
   git push --force --all
   git push --force --tags
   ```

5. **Add pre-commit hooks** to prevent future leaks:
   ```bash
   npm install -D husky @commitlint/cli detect-secrets
   npx husky install
   npx husky add .husky/pre-commit "npx detect-secrets-hook"
   ```

### WITHIN 1 WEEK:
6. **Security audit** of Airtable/GitHub/OpenAI accounts for suspicious activity

7. **Update documentation** with new secrets handling policy

---

## PREVENTION MEASURES (Implement Now)

1. ✅ **Centralized env.ts** - Already implemented
2. ✅ **Vercel Env Vars** - User confirmed already set
3. ⏳ **Git hooks** - Install detect-secrets
4. ⏳ **.gitignore** - Verify .env* files excluded
5. ⏳ **CI/CD** - Add secret scanning to GitHub Actions

---

## CURRENT STATUS

- ⚠️ **Scan NOT yet performed** (waiting approval)
- ✅ **Source of truth is Vercel Env Vars** (confirmed by user)
- ✅ **Code now reads from process.env** (via src/env.ts)
- ⚠️ **History NOT yet sanitized** (if needed)

---

## RECOMMENDATION

**Low Risk** if:
- Repository is private
- Secrets were rotated after e6019ff commit
- No suspicious activity in connected services

**High Risk** if:
- Repository is/was public
- Commits with secrets were pushed to public branch
- Secrets have NOT been rotated since refactoring

**NEXT STEP**: Run scan commands above and decide on action plan.

---

**END OF SCAN PLAN**
