# Stop leftover API hosts and their parent `dotnet watch` trees.
# Those leftovers lock bin\Debug\net10.0\HRTimeTracking.Api.dll (MSB3027).
$ErrorActionPreference = 'SilentlyContinue'
$killed = [System.Collections.Generic.HashSet[int]]::new()

function Get-ChildProcessIds([int]$ProcessId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" | ForEach-Object {
        $_.ProcessId
        Get-ChildProcessIds $_.ProcessId
    }
}

function Stop-DotnetTree([int]$ProcessId) {
    if ($ProcessId -le 4 -or $killed.Contains($ProcessId)) { return }

    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId"
    if (-not $current) { return }

    $top = $current
    while ($true) {
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($top.ParentProcessId)"
        if (-not $parent -or $parent.Name -notmatch '^(dotnet|HRTimeTracking)') { break }
        $top = $parent
    }

    $ids = @($top.ProcessId) + @(Get-ChildProcessIds $top.ProcessId)
    foreach ($id in ($ids | Select-Object -Unique)) {
        if ($id -gt 4 -and $killed.Add($id)) {
            $detail = Get-CimInstance Win32_Process -Filter "ProcessId = $id"
            Write-Host "Stopping PID $id  $($detail.Name)"
            Stop-Process -Id $id -Force
        }
    }
}

Get-NetTCPConnection -LocalPort 5085 -State Listen | ForEach-Object {
    Stop-DotnetTree $_.OwningProcess
}

Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match '^(dotnet|HRTimeTracking)' -and
    $_.CommandLine -match 'HRTimeTracking\.Api|HRBreakTimeTrackingV6'
} | ForEach-Object {
    Stop-DotnetTree $_.ProcessId
}

# Stuck watches started from this folder often omit the csproj in CommandLine.
Get-CimInstance Win32_Process -Filter "Name = 'dotnet.exe'" | Where-Object {
    $_.CommandLine -match 'watch(\.dll")?\s+run' -and
    $_.CommandLine -notmatch '\.csproj'
} | ForEach-Object {
    Stop-DotnetTree $_.ProcessId
}

Get-Process -Name 'HRTimeTracking.Api' | ForEach-Object { Stop-DotnetTree $_.Id }

Start-Sleep -Seconds 1

$listening = Get-NetTCPConnection -LocalPort 5085 -State Listen
$hosts = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'HRTimeTracking\.Api\.dll'
}
if ($listening -or $hosts) {
    Write-Host 'API host is still running. Press Ctrl+C in other terminals that have dotnet watch, then run this script again.'
} else {
    Write-Host 'Port 5085 is free. You can run: dotnet watch run --launch-profile http'
}
