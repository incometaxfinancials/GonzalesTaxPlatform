$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\leadf\Desktop\ITF Tax Platform.lnk")
$Shortcut.TargetPath = "C:\Users\leadf\Desktop\ITF Tax Platform.bat"
$Shortcut.WorkingDirectory = "C:\Users\leadf\GonzalesTaxPlatform\frontend\web"
$Shortcut.IconLocation = "C:\Users\leadf\Desktop\itf-logo.ico,0"
$Shortcut.Description = "ITF - Income Tax Financials - Professional Tax Solutions"
$Shortcut.Save()
Write-Host "Shortcut updated with ITF logo icon!"
