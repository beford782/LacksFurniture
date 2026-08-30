[CmdletBinding()]
param(
    [string]$Python,
    [string]$Node,
    [switch]$ListOnly,
    [switch]$KeepGoing,
    [switch]$SkipMutationSweep
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-DreamFinderProgram {
    param(
        [string]$Explicit,
        [string[]]$Candidates,
        [string]$Label
    )

    $attempts = @()
    if ($Explicit) {
        $attempts += $Explicit
    }
    $attempts += $Candidates

    foreach ($attempt in $attempts) {
        if (-not $attempt) {
            continue
        }
        if (Test-Path -LiteralPath $attempt -PathType Leaf) {
            return (Resolve-Path -LiteralPath $attempt).Path
        }
        $resolved = Get-Command $attempt -ErrorAction SilentlyContinue
        if ($resolved) {
            return $resolved.Source
        }
    }

    throw "$Label was not found. Pass its executable path explicitly."
}

function Invoke-DreamFinderCheck {
    param(
        [string]$Name,
        [string]$Executable,
        [string[]]$Arguments
    )

    $shownArguments = ($Arguments | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
    }) -join ' '
    Write-Host "`n==> $Name" -ForegroundColor Cyan
    Write-Host "    $Executable $shownArguments" -ForegroundColor DarkGray

    $startedAt = Get-Date
    & $Executable @Arguments
    $exitCode = $LASTEXITCODE
    $elapsed = (Get-Date) - $startedAt
    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode after $([math]::Round($elapsed.TotalSeconds, 1))s."
    }
    Write-Host "    PASS ($([math]::Round($elapsed.TotalSeconds, 1))s)" -ForegroundColor Green
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$bundledPython = if ($env:USERPROFILE) {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
} else {
    $null
}
$bundledNode = if ($env:USERPROFILE) {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
} else {
    $null
}
$bundledPwsh = if ($env:USERPROFILE) {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
} else {
    $null
}

$pythonExecutable = Resolve-DreamFinderProgram -Explicit $Python -Candidates @(
    'python',
    'python3',
    $bundledPython
) -Label 'Python'
$nodeExecutable = Resolve-DreamFinderProgram -Explicit $Node -Candidates @(
    'node',
    $bundledNode
) -Label 'Node.js'
$gitExecutable = Resolve-DreamFinderProgram -Candidates @('git') -Label 'Git'
$powerShellExecutable = Resolve-DreamFinderProgram -Candidates @(
    'pwsh',
    $bundledPwsh,
    'powershell'
) -Label 'PowerShell (pwsh preferred; the Codex-bundled pwsh or Windows PowerShell 5.1 accepted)'

# Mirror of the `verify` job in .github/workflows/ci.yml, in CI order: 47 checks
# plus the mutation sweep = 48. (The CI job's display name, "Full suite (18
# checks)", is a legacy label pinned by branch protection; do not trust its
# number.) When ci.yml gains or loses a `run: node|python ...` step, change
# this list in the same PR so the local mirror stays complete.
$checks = @(
    @{ Name = 'validation self-test'; Exe = $pythonExecutable; Args = @('tools/validation.py', '--self-test') },
    @{ Name = 'financing totality'; Exe = $pythonExecutable; Args = @('tests/financing_totality_check.py') },
    @{ Name = 'pricing totality'; Exe = $pythonExecutable; Args = @('tests/pricing_totality_check.py') },
    @{ Name = 'smoke'; Exe = $pythonExecutable; Args = @('tests/smoke_check.py') },
    @{ Name = 'canonical self-test'; Exe = $pythonExecutable; Args = @('tests/golden/canonical.py', '--self-test') },
    @{ Name = 'converter self-test'; Exe = $pythonExecutable; Args = @('tools/convert_store_data.py', '--self-test') },
    @{ Name = 'reverify self-test'; Exe = $pythonExecutable; Args = @('tools/reverify_financing.py', '--self-test') },
    @{ Name = 'workbook validation'; Exe = $pythonExecutable; Args = @('tools/validate_workbook.py', 'incoming/Lacks_Store_Data.xlsx', '--source-images', 'incoming/images', '--warnings-as-errors') },
    @{ Name = 'strict golden bundle'; Exe = $pythonExecutable; Args = @('tests/golden/run_golden.py', '--strict') },
    @{ Name = 'canonical Lacks lineage'; Exe = $pythonExecutable; Args = @('tests/lineage_check.py') },
    @{ Name = 'QR payload suite'; Exe = $pythonExecutable; Args = @('tests/qr_payload_check.py') },
    @{ Name = 'QR committed-asset check'; Exe = $pythonExecutable; Args = @('incoming/generate_financing_qr.py', '--check') },
    @{ Name = 'financing renderer'; Exe = $nodeExecutable; Args = @('tests/financing_render_check.mjs') },
    @{ Name = 'scoring isolation'; Exe = $nodeExecutable; Args = @('tests/scoring_isolation_check.mjs') },
    @{ Name = 'payment choice state model'; Exe = $nodeExecutable; Args = @('tests/payment_choice_check.mjs') },
    @{ Name = 'financing copy policy'; Exe = $nodeExecutable; Args = @('tests/financing_copy_policy_check.mjs') },
    @{ Name = 'financing taxonomy'; Exe = $nodeExecutable; Args = @('tests/financing_taxonomy_check.mjs') },
    @{ Name = 'financing URL'; Exe = $nodeExecutable; Args = @('tests/financing_url_check.mjs') },
    @{ Name = 'exact-promotions policy'; Exe = $nodeExecutable; Args = @('tests/exact_promotions_policy_check.mjs') },
    @{ Name = 'email gating'; Exe = $nodeExecutable; Args = @('tests/email_gating_check.mjs') },
    @{ Name = 'contrast'; Exe = $nodeExecutable; Args = @('tests/contrast_check.mjs') },
    @{ Name = 'drawer dialog lifecycle'; Exe = $nodeExecutable; Args = @('tests/drawer_lifecycle_check.mjs') },
    @{ Name = 'session safety'; Exe = $nodeExecutable; Args = @('tests/session_safety_check.mjs') },
    @{ Name = 'session async and diagnostic privacy'; Exe = $nodeExecutable; Args = @('tests/session_async_check.mjs') },
    @{ Name = 'data-error recovery'; Exe = $nodeExecutable; Args = @('tests/data_error_recovery_check.mjs') },
    @{ Name = 'consultation priorities'; Exe = $nodeExecutable; Args = @('tests/consultation_priorities_check.mjs') },
    @{ Name = 'sleep plan'; Exe = $nodeExecutable; Args = @('tests/sleep_plan_check.mjs') },
    @{ Name = 'rendered layout (Plan four viewports + Summary + forced-colors)'; Exe = $pythonExecutable; Args = @('tests/sleep_plan_layout_check.py') },
    @{ Name = 'email priorities'; Exe = $nodeExecutable; Args = @('tests/email_priorities_check.mjs') },
    @{ Name = 'consultation summary'; Exe = $nodeExecutable; Args = @('tests/consultation_summary_check.mjs') },
    @{ Name = 'motion spike flag gate and gather'; Exe = $nodeExecutable; Args = @('tests/motion_flag_check.mjs') },
    @{ Name = 'compare modal dialog semantics'; Exe = $nodeExecutable; Args = @('tests/compare_modal_check.mjs') },
    @{ Name = 'construction reveal repair'; Exe = $nodeExecutable; Args = @('tests/construction_reveal_repair_check.mjs') },
    @{ Name = 'compare entry point'; Exe = $nodeExecutable; Args = @('tests/compare_entry_check.mjs') },
    @{ Name = 'phase 1 output regression'; Exe = $nodeExecutable; Args = @('tests/phase1_output_regression_check.mjs') },
    @{ Name = 'claim retirement'; Exe = $nodeExecutable; Args = @('tests/claim_retirement_check.mjs') },
    @{ Name = 'integrity repairs'; Exe = $nodeExecutable; Args = @('tests/integrity_repairs_check.mjs') },
    @{ Name = 'results presentation'; Exe = $nodeExecutable; Args = @('tests/results_presentation_check.mjs') },
    @{ Name = 'sleep brief presentation'; Exe = $nodeExecutable; Args = @('tests/sleep_brief_presentation_check.mjs') },
    @{ Name = 'quiz presentation'; Exe = $nodeExecutable; Args = @('tests/quiz_presentation_check.mjs') },
    @{ Name = 'sleep system presentation'; Exe = $nodeExecutable; Args = @('tests/sleep_system_presentation_check.mjs') },
    @{ Name = 'trust integrity'; Exe = $nodeExecutable; Args = @('tests/trust_integrity_check.mjs') },
    @{ Name = 'daybreak contract'; Exe = $pythonExecutable; Args = @('tests/daybreak_contract_check.py') },
    @{ Name = 'pricing contract (dark shipped-state lock)'; Exe = $pythonExecutable; Args = @('tests/pricing_contract_check.py') },
    @{ Name = 'pricing resolver (2.1b five-axis contract)'; Exe = $nodeExecutable; Args = @('tests/pricing_resolver_check.mjs') },
    @{ Name = 'daybreak demo server'; Exe = $pythonExecutable; Args = @('tests/daybreak_server_check.py') },
    @{ Name = 'daybreak demo runtime'; Exe = $nodeExecutable; Args = @('tests/daybreak_demo_runtime_check.mjs') }
)
if (-not $SkipMutationSweep) {
    $checks += @{ Name = 'mutation sweep'; Exe = $nodeExecutable; Args = @('tests/mutation_sweep.mjs') }
}

if ($ListOnly) {
    Write-Host "DreamFinder local full suite: $($checks.Count) checks"
    $checks | ForEach-Object { Write-Host "- $($_.Name)" }
    exit 0
}

$protectedFiles = @(
    'index.html',
    'Code.gs',
    'manifest.json',
    'data/store-config.json',
    'data/quiz.json',
    'data/mattresses.json',
    'data/mattresses.csv',
    'data/mattresses-es.csv',
    'data/accessories.json',
    'data/allowed-hosts.js',
    'data/dict-en.json',
    'data/dict-es.json',
    'images/qr-financing.svg',
    'incoming/lacks_financing.json',
    'incoming/lacks_mattresses.json',
    'incoming/lacks_accessories.json',
    'incoming/lacks_store_values.json',
    'incoming/dreamfinder_quiz.json',
    'incoming/Lacks_Store_Data.xlsx',
    'incoming/lacks_promotions.json',
    'tools/source_hosts.json',
    'demo/daybreak-black-friday.json',
    'demo/black-friday/index.html',
    'demo/black-friday/data/store-config.json',
    'demo/black-friday/manifest.json'
)

Push-Location $repoRoot
try {
    Write-Host 'DreamFinder local CI mirror' -ForegroundColor Yellow
    Write-Host "Repository: $repoRoot"
    Write-Host "Checks:     $($checks.Count)"
    Invoke-DreamFinderCheck -Name 'Python toolchain' -Executable $pythonExecutable -Arguments @(
        '-c',
        "import openpyxl, PIL, qrcode; print('Python dependencies OK:', openpyxl.__version__, PIL.__version__)"
    )
    Invoke-DreamFinderCheck -Name 'Node.js toolchain' -Executable $nodeExecutable -Arguments @('--version')
    Invoke-DreamFinderCheck -Name 'PowerShell toolchain' -Executable $powerShellExecutable -Arguments @('-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()')

    $initialStatus = (& $gitExecutable status --porcelain=v1 --untracked-files=all) -join "`n"
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture the initial Git working-tree state.'
    }

    $initialHashes = @{}
    foreach ($protectedFile in $protectedFiles) {
        if (-not (Test-Path -LiteralPath $protectedFile -PathType Leaf)) {
            throw "Protected artifact is missing: $protectedFile"
        }
        $initialHashes[$protectedFile] = (Get-FileHash -LiteralPath $protectedFile -Algorithm SHA256).Hash
    }

    $failures = [System.Collections.Generic.List[string]]::new()
    foreach ($check in $checks) {
        try {
            Invoke-DreamFinderCheck -Name $check.Name -Executable $check.Exe -Arguments $check.Args
        } catch {
            $failures.Add($_.Exception.Message)
            Write-Host "    FAIL: $($_.Exception.Message)" -ForegroundColor Red
            if (-not $KeepGoing) {
                break
            }
        }
    }

    try {
        Invoke-DreamFinderCheck -Name 'working-tree whitespace check' -Executable $gitExecutable -Arguments @('diff', '--check')
        Invoke-DreamFinderCheck -Name 'staged whitespace check' -Executable $gitExecutable -Arguments @('diff', '--cached', '--check')
    } catch {
        $failures.Add($_.Exception.Message)
    }

    foreach ($protectedFile in $protectedFiles) {
        $finalHash = (Get-FileHash -LiteralPath $protectedFile -Algorithm SHA256).Hash
        if ($finalHash -ne $initialHashes[$protectedFile]) {
            $failures.Add("Protected artifact changed while tests ran: $protectedFile")
        }
    }

    $finalStatus = (& $gitExecutable status --porcelain=v1 --untracked-files=all) -join "`n"
    if ($LASTEXITCODE -ne 0) {
        $failures.Add('Unable to capture the final Git working-tree state.')
    } elseif ($finalStatus -ne $initialStatus) {
        $failures.Add('The Git working-tree state changed while tests ran.')
        Write-Host "`nInitial status:`n$initialStatus" -ForegroundColor DarkGray
        Write-Host "`nFinal status:`n$finalStatus" -ForegroundColor DarkGray
    }

    if ($failures.Count -gt 0) {
        Write-Host "`nDreamFinder full suite FAILED ($($failures.Count) issue(s)):" -ForegroundColor Red
        $failures | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 1
    }

    Write-Host "`nDreamFinder full suite PASSED: $($checks.Count) checks plus integrity guards." -ForegroundColor Green
} finally {
    Pop-Location
}
