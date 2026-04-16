$lr = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/admin/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"superadmin@randco.com","password":"Admin@123!"}'
$t = $lr.data.access_token

# Get game ID
$games = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/admin/games?page=1&limit=10" -Headers @{Authorization="Bearer $t"}
$gameId = $games.data.games[0].id
$gameName = $games.data.games[0].name
Write-Host "Game: $gameName ($gameId)"

# Upload logo using prize-iphone.jpg
$filePath = "src/assets/prize-iphone.jpg"
$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$boundary = "----FormBoundary" + [System.Guid]::NewGuid().ToString("N")

$ms = New-Object System.IO.MemoryStream
$header = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"logo.jpg`"`r`nContent-Type: image/jpeg`r`n`r`n"
$headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
$ms.Write($headerBytes, 0, $headerBytes.Length)
$ms.Write($fileBytes, 0, $fileBytes.Length)
$footer = "`r`n--$boundary--`r`n"
$footerBytes = [System.Text.Encoding]::UTF8.GetBytes($footer)
$ms.Write($footerBytes, 0, $footerBytes.Length)
$bodyBytes = $ms.ToArray()

try {
    $res = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/admin/games/$gameId/logo" -Method POST `
        -Headers @{Authorization="Bearer $t"; "Content-Type"="multipart/form-data; boundary=$boundary"} `
        -Body $bodyBytes
    Write-Host "Upload SUCCESS"
    Write-Host "logo_url: $($res.data.logo_url)"
} catch {
    Write-Host "Upload FAILED: $($_.ErrorDetails.Message)"
}
