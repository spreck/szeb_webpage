# start_services.ps1

Write-Host "Starting ngrok..."
Start-Process ngrok -ArgumentList "http 80" -NoNewWindow

Write-Host "Waiting for ngrok to generate a public URL..."
$timeout = 60  # Timeout in seconds
$timer = [Diagnostics.Stopwatch]::StartNew()
while ($timer.Elapsed.TotalSeconds -lt $timeout) {
    $ngrokInfo = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalAddress -eq "127.0.0.1" -and $_.LocalPort -eq 4040 }
    if ($ngrokInfo) {
        $ngrokUrl = (Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing).Content | ConvertFrom-Json
        $NGROK_URL = ($ngrokUrl.tunnels | Where-Object { $_.proto -eq "https" }).public_url
        if ($NGROK_URL) {
            Write-Host "Ngrok URL found: $NGROK_URL"
            break
        }
    }
    Start-Sleep -Seconds 1
}

if (-not $NGROK_URL) {
    Write-Host "Failed to get ngrok URL within the timeout period."
    exit
}

Write-Host "Setting GEOSERVER_URL environment variable..."
$env:GEOSERVER_URL = "$NGROK_URL/geoserver"
Write-Host "GEOSERVER_URL set to: $env:GEOSERVER_URL"

Write-Host "Updating DuckDNS..."
$DUCKDNS_DOMAIN = "conescout"
$DUCKDNS_TOKEN = "1cff4977-099e-42f4-afb1-a7c7c146bf0e"
$NGROK_HOST = ([System.Uri]$NGROK_URL).Host
$DUCKDNS_URL = "https://www.duckdns.org/update?domains=$DUCKDNS_DOMAIN&token=$DUCKDNS_TOKEN&txt=$NGROK_HOST&verbose=true"

try {
    $DUCKDNS_RESPONSE = Invoke-RestMethod -Uri $DUCKDNS_URL -Method Get
    Write-Host "DuckDNS Response: $DUCKDNS_RESPONSE"
    if ($DUCKDNS_RESPONSE -eq "OK") {
        Write-Host "DuckDNS updated successfully with ngrok URL"
    } else {
        Write-Host "Failed to update DuckDNS. Response: $DUCKDNS_RESPONSE"
    }
} catch {
    Write-Host "Error updating DuckDNS: $_"
}

Write-Host "Starting Docker Compose..."
docker-compose up -d

Write-Host "Services started. GEOSERVER_URL set to: $env:GEOSERVER_URL"
Write-Host "Your site is now accessible at: http://$DUCKDNS_DOMAIN.duckdns.org"
Write-Host "Script completed. Check above for any errors."