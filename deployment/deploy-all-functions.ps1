# PowerShell script to deploy all specified functions to Supabase
# This script handles the renaming of 'index_new.ts' to 'index.ts' for deployment if index_new.ts exists.
# If index_new.ts does not exist but index.ts does, it deploys using the existing index.ts without renaming.

# --- CONFIGURATION ---
$ProjectId = "gjvtncdjcslnkfctqnfy"
$Functions = @(
    "calculate-snapshot"
    "process-command",
    "execute-command",
    "text-to-speech",
    "tesouro-direto-proxy",
    "usd-brl-rate",
    "create-user",
    "cognitive-core",
    "ingest-news-cron",
    "ingest-portfolio-webhook",
    "ingest-market-data-cron",
    "sentinel-agent-cron",
    "test-cognitive",
    "master-router",
    "governor-agent",
    "resilience-wrapper",
    "moe-orchestrator",
    "system-health",
    "test-gemini-embedding",
    "validate-system"
)
$FunctionsDir = ".\supabase\functions"

# --- SCRIPT ---

Write-Host "🚀 Starting Supabase functions deployment for project: $ProjectId" -ForegroundColor Green

foreach ($functionName in $Functions) {
    Write-Host "---"
    Write-Host "Processing function: $functionName" -ForegroundColor Cyan

    $funcPath = Join-Path $FunctionsDir $functionName
    $indexPath = Join-Path $funcPath "index.ts"
    $newIndexPath = Join-Path $funcPath "index_new.ts"
    $backupIndexPath = Join-Path $funcPath "index.ts.bak"

    # Check if function directory exists
    if (-not (Test-Path $funcPath)) {
        Write-Host "⚠️ WARNING: Function directory '$funcPath' not found. Skipping deployment for '$functionName'." -ForegroundColor Yellow
        continue
    }

    $useNew = Test-Path $newIndexPath
    $hasOriginal = Test-Path $indexPath

    if (-not $useNew -and -not $hasOriginal) {
        Write-Host "⚠️ WARNING: Neither 'index_new.ts' nor 'index.ts' found in '$funcPath'. Skipping deployment for '$functionName'." -ForegroundColor Yellow
        continue
    }

    $didRename = $false

    if ($useNew) {
        Write-Host "  -> Using 'index_new.ts' for deployment."
        # Backup existing index.ts if it exists
        if ($hasOriginal) {
            Write-Host "  -> Backing up existing 'index.ts' to 'index.ts.bak'"
            Rename-Item -Path $indexPath -NewName "index.ts.bak" -Force
        }
        # Rename index_new.ts to index.ts
        Write-Host "  -> Renaming 'index_new.ts' to 'index.ts' for deployment"
        Rename-Item -Path $newIndexPath -NewName "index.ts"
        $didRename = $true
    } else {
        Write-Host "  -> No 'index_new.ts' found; using existing 'index.ts' for deployment."
    }

    # Deploy the function
    Write-Host "  -> Deploying '$functionName' to Supabase..."
    try {
        supabase functions deploy $functionName --project-ref $ProjectId --no-verify-jwt
        if ($LASTEXITCODE -ne 0) {
            throw "Deployment failed for '$functionName'."
        }
        Write-Host "  ✅ Successfully deployed '$functionName'." -ForegroundColor Green
    }
    catch {
        Write-Host "❌ ERROR: Deployment failed for '$functionName'. Error: $_" -ForegroundColor Red
        # Revert if we renamed
        if ($didRename) {
            Rename-Item -Path $indexPath -NewName "index_new.ts"
            if (Test-Path $backupIndexPath) {
                Rename-Item -Path $backupIndexPath -NewName "index.ts"
            }
        }
        exit $LASTEXITCODE
    }

    # Revert the file rename if we did it
    if ($didRename) {
        Write-Host "  -> Reverting filename changes"
        Rename-Item -Path $indexPath -NewName "index_new.ts"
        if (Test-Path $backupIndexPath) {
            Rename-Item -Path $backupIndexPath -NewName "index.ts"
        }
    }
}

Write-Host "---"
Write-Host "🎉 All functions deployed successfully!" -ForegroundColor Green