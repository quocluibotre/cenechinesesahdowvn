param(
    [Parameter(Mandatory = $true)]
    [string]$Api,

    [string]$Token = "",
    [int]$MaxPages = 20,
    [int]$Limit = 50,
    [int]$MaxRounds = 6,
    [switch]$PublishedOnly,
    [switch]$SkipRetranslate,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Resolve-ApiBase {
    param([string]$Raw)

    if ([string]::IsNullOrWhiteSpace($Raw)) {
        $safe = ""
    } else {
        $safe = $Raw.Trim().TrimEnd('/')
    }

    if (-not $safe) {
        throw "Api base is required"
    }

    if ($safe.EndsWith('/api')) {
        return $safe
    }

    return "$safe/api"
}

function Get-YoutubeId {
    param([string]$Url)

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return ""
    }

    $match = [regex]::Match($Url, '(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})')
    if ($match.Success) {
        return $match.Groups[1].Value
    }

    return ""
}

function Get-AuthHeaders {
    param([string]$RawToken)

    $headers = @{}
    if ([string]::IsNullOrWhiteSpace($RawToken)) {
        $safeToken = ""
    } else {
        $safeToken = $RawToken.Trim()
    }

    if ($safeToken) {
        if ($safeToken.StartsWith('Bearer ')) {
            $headers['Authorization'] = $safeToken
        } else {
            $headers['Authorization'] = "Bearer $safeToken"
        }
    }

    return $headers
}

$apiBase = Resolve-ApiBase -Raw $Api
$headers = Get-AuthHeaders -RawToken $Token
$importScript = Join-Path $PSScriptRoot 'import_subtitles_local.js'

if (-not (Test-Path $importScript)) {
    throw "Cannot find import script at $importScript"
}

Write-Host "[scan] apiBase=$apiBase"

$videos = @()
for ($page = 1; $page -le $MaxPages; $page++) {
    $url = "$apiBase/product?limit=$Limit&page=$page"
    if ($PublishedOnly) {
        $url += '&status=published'
    }

    $resp = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
    $rows = @($resp.data)

    if ($rows.Count -eq 0) {
        break
    }

    $videos += $rows
    Write-Host "[scan] page=$page videos=$($rows.Count)"

    $totalPages = 0
    if ($resp.pagination) {
        if ($resp.pagination.totalPages) {
            $totalPages = [int]$resp.pagination.totalPages
        } elseif ($resp.pagination.total_pages) {
            $totalPages = [int]$resp.pagination.total_pages
        }
    }

    if ($totalPages -gt 0 -and $page -ge $totalPages) {
        break
    }
}

if ($videos.Count -eq 0) {
    Write-Host '[done] no videos found from API'
    exit 0
}

$targets = @()
foreach ($video in $videos) {
    $videoId = [int]$video.id
    if ($videoId -le 0) {
        continue
    }

    try {
        $subResp = Invoke-RestMethod -Uri "$apiBase/youtube/subtitles/$videoId" -Method Get -Headers $headers -ErrorAction Stop
    } catch {
        Write-Host "[skip] video_id=$videoId cannot check subtitle count: $($_.Exception.Message)"
        continue
    }

    $count = [int]($subResp.count)
    if ($count -gt 0) {
        continue
    }

    $youtubeId = Get-YoutubeId -Url ([string]$video.video_url)
    if (-not $youtubeId) {
        Write-Host "[skip] video_id=$videoId has no valid youtube id"
        continue
    }

    $targets += [PSCustomObject]@{
        id = $videoId
        youtube_id = $youtubeId
        title = [string]$video.title
    }
}

Write-Host "[scan] missing-subtitle videos=$($targets.Count)"

if ($targets.Count -eq 0) {
    Write-Host '[done] no missing subtitle videos'
    exit 0
}

if ($DryRun) {
    foreach ($item in $targets) {
        Write-Host "[dry-run] video_id=$($item.id) youtube_id=$($item.youtube_id) title=$($item.title)"
    }
    exit 0
}

$ok = 0
$failed = 0

foreach ($item in $targets) {
    Write-Host "[run] import video_id=$($item.id) youtube_id=$($item.youtube_id)"

    $nodeArgs = @(
        $importScript,
        '--api', $apiBase,
        '--video-id', [string]$item.id,
        '--youtube-id', [string]$item.youtube_id,
        '--max-rounds', [string]$MaxRounds
    )

    if ($Token) {
        $nodeArgs += @('--token', $Token)
    }

    if ($SkipRetranslate) {
        $nodeArgs += '--skip-retranslate'
    }

    & node @nodeArgs

    if ($LASTEXITCODE -eq 0) {
        $ok += 1
    } else {
        $failed += 1
        Write-Host "[fail] video_id=$($item.id) exit_code=$LASTEXITCODE"
    }
}

Write-Host "[summary] success=$ok failed=$failed total=$($targets.Count)"
if ($failed -gt 0) {
    exit 1
}
