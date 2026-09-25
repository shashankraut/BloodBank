# Deployment Scripts

This directory contains deployment automation scripts for Firebase Cloud Functions.

## Available Scripts

### 1. `deploy.sh` (Linux/Mac)

Bash script for deploying functions with pre-deployment checks and post-deployment verification.

**Usage:**
```bash
# Make executable (first time only)
chmod +x functions/scripts/deploy.sh

# Deploy to production (90 days retention)
./functions/scripts/deploy.sh production

# Deploy to staging (60 days retention)
./functions/scripts/deploy.sh staging

# Deploy to dev (30 days retention)
./functions/scripts/deploy.sh dev

# Dry run (no actual deployment)
./functions/scripts/deploy.sh production --dry-run

# Skip tests (not recommended)
./functions/scripts/deploy.sh production --skip-tests

# Deploy specific function only
./functions/scripts/deploy.sh production --function-only=cleanupOldContactRequests
```

### 2. `deploy.bat` (Windows)

Batch script for deploying functions on Windows systems.

**Usage:**
```cmd
REM Deploy to production (90 days retention)
functions\scripts\deploy.bat production

REM Deploy to staging (60 days retention)
functions\scripts\deploy.bat staging

REM Deploy to dev (30 days retention)
functions\scripts\deploy.bat dev

REM Dry run (no actual deployment)
functions\scripts\deploy.bat production --dry-run

REM Skip tests (not recommended)
functions\scripts\deploy.bat production --skip-tests
```

## What the Scripts Do

### Pre-Deployment Checks
1. ✅ Verify Firebase CLI is installed
2. ✅ Check Firebase authentication status
3. ✅ Verify Node.js version (20+)
4. ✅ Confirm in correct directory

### Deployment Process
1. 📦 Install dependencies (`npm ci`)
2. 🧪 Run tests (unless `--skip-tests`)
3. 💾 Backup current configuration
4. ⚠️  Ask for confirmation (unless `--dry-run`)
5. 🚀 Deploy functions with environment-specific retention
6. ✅ Verify deployment and save configuration
7. Log details

### Environment-Specific Retention

| Environment | Retention Period | Use Case |
|-------------|-----------------|----------|
| `dev` | 30 days | Development and testing |
| `staging` | 60 days | Pre-production validation |
| `production` | 90 days | Production environment |

## Safety Features

- **Configuration Backup**: Automatically backs up Firebase configuration before deployment
- **Test Execution**: Runs all tests before deployment (can be skipped with `--skip-tests`)
- **Confirmation Prompt**: Requires explicit confirmation before deploying
- **Dry Run Mode**: Preview deployment without executing (`--dry-run`)
- **Post-Deployment Verification**: Saves configuration after deployment for audit trail
- **Timestamped Backups**: All backups stored with timestamp in `functions/backups/`

## Backup Location

All backups are stored in:
```
functions/backups/YYYYMMDD_HHMMSS/
├── config-before.json   # Configuration before deployment
├── config-after.json    # Configuration after deployment (if deployed)
└── project.txt          # Firebase project name
```

## Troubleshooting

### Error: Firebase CLI not found
```bash
npm install -g firebase-tools
```

### Error: Not logged in to Firebase
```bash
firebase login
```

### Error: Node.js version too old
Install Node.js 20 or higher from https://nodejs.org/

### Error: Tests failed
Fix the failing tests before deploying. Do not use `--skip-tests` unless absolutely necessary.

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Deploy Functions
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
  run: |
    chmod +x functions/scripts/deploy.sh
    ./functions/scripts/deploy.sh production --skip-tests
```

### GitLab CI Example

```yaml
deploy:production:
  stage: deploy
  script:
    - chmod +x functions/scripts/deploy.sh
    - ./functions/scripts/deploy.sh production --skip-tests
  only:
    - main
```

## Manual Deployment (Without Scripts)

If you need to deploy manually:

```bash
cd functions
npm ci
npm test
cd ..
firebase deploy --only functions --set-env-vars CONTACT_REQUEST_RETENTION_DAYS=90
```

## Support

For issues with deployment scripts:
- Check the script output for specific error messages
- Review Firebase logs: `firebase functions:log`
- Consult the main README: `functions/README.md`
- Check operations runbook: `functions/OPERATIONS_RUNBOOK.md`
