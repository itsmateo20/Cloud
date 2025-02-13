# Function to read .gitignore and convert to exclusion patterns
function Get-GitignorePatterns {
    param (
        [string]$gitignoreFile
    )

    $patterns = @(".git", ".github", "docs", "node_modules", ".next")
    Get-Content $gitignoreFile | ForEach-Object {
        $line = $_.Trim()
        if (-not [string]::IsNullOrWhiteSpace($line) -and -not $line.StartsWith("#")) {
            $patterns += $line
        }
    }
    return $patterns
}

# Recursive function to print directory tree
function Print-Tree {
    param (
        [string]$dir,
        [string]$prefix = ""
    )

    $items = Get-ChildItem -Path $dir -Force | Where-Object {
        $_.Name -notin $exclusions
    }

    foreach ($item in $items) {
        Write-Output "$prefix|____$($item.Name)"
        if ($item.PSIsContainer) {
            Print-Tree -dir $item.FullName -prefix "$prefix|    "
        }
    }
}

# Ensure the .gitignore file exists
if (-Not (Test-Path .gitignore)) {
    Write-Host ".gitignore file not found!"
    exit 1
}

# Get the exclusion patterns from .gitignore
$exclusions = Get-GitignorePatterns -gitignoreFile ".gitignore"

# Print the directory tree
Print-Tree -dir (Get-Location)
