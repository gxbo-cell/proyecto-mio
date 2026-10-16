$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
$gitDirectory = if ($gitCommand) { Split-Path -Parent $gitCommand.Source } else { "C:\Program Files\Git\cmd" }

if (-not (Test-Path (Join-Path $gitDirectory "git.exe"))) {
	Write-Error "Git no está instalado en una ubicación reconocida."
	exit 1
}

$env:Path = "$gitDirectory;$env:Path"
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $root
$watcher.Filter = "*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName
$watcher.EnableRaisingEvents = $true
$sourcePrefix = "ProyectoAutoPush"
$eventNames = @("Changed", "Created", "Deleted", "Renamed")

foreach ($eventName in $eventNames) {
	Register-ObjectEvent -InputObject $watcher -EventName $eventName -SourceIdentifier "$sourcePrefix.$eventName" | Out-Null
}

Write-Output "Auto-sync activo: los cambios guardados se subirán tras 5 segundos sin nuevas ediciones."
$lastChange = $null

try {
	while ($true) {
		$event = Wait-Event -Timeout 1
		if ($event) {
			$queuedEvents = @(Get-Event | Where-Object { $_.SourceIdentifier.StartsWith($sourcePrefix) })
			foreach ($queuedEvent in $queuedEvents) {
				$changedPath = $queuedEvent.SourceEventArgs.FullPath
				$relativePath = $changedPath.Substring($root.Length).TrimStart("\", "/") -replace "/", "\"
				Remove-Event -EventIdentifier $queuedEvent.EventIdentifier
				if ($relativePath -match "^\.git\\") {
					continue
				}
				$lastChange = [DateTime]::UtcNow
			}
		}

		if ($lastChange -and ([DateTime]::UtcNow - $lastChange).TotalSeconds -ge 5) {
			$lastChange = $null
			git.exe -C $root add -A -- .
			if ($LASTEXITCODE -ne 0) {
				Write-Error "No se pudieron preparar los cambios para publicar."
				continue
			}

			git.exe -C $root diff --cached --quiet
			$diffExitCode = $LASTEXITCODE
			if ($diffExitCode -eq 0) {
				continue
			}
			if ($diffExitCode -ne 1) {
				Write-Error "No se pudo revisar el contenido preparado para publicar."
				continue
			}

			$commitMessage = "Auto-sync guardado $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
			git.exe -C $root -c "user.name=Workspace Auto Sync" -c "user.email=workspace-auto-sync@users.noreply.github.com" commit -m $commitMessage
			if ($LASTEXITCODE -ne 0) {
				Write-Error "No se pudo crear el commit automático."
				continue
			}

			git.exe -C $root push origin HEAD
			if ($LASTEXITCODE -ne 0) {
				Write-Error "El commit quedó local, pero no se pudo subir. Revisa la conexión y la autenticación de GitHub."
			} else {
				Write-Output "Cambios publicados en GitHub."
			}
		}
	}
} finally {
	$watcher.EnableRaisingEvents = $false
	$watcher.Dispose()
	foreach ($eventName in $eventNames) {
		Unregister-Event -SourceIdentifier "$sourcePrefix.$eventName" -ErrorAction SilentlyContinue
	}
}