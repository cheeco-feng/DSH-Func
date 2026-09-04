@echo off
chcp 65001 >nul
setlocal
echo ===== StartControllers build =====
set "DIR=F:\DeepSeekHarnessDataOriginal\DSH-Func\exe-tool-start-controllers"
set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
set "OUT=%DIR%\start-controllers.exe"
echo compiling  %OUT%
"%CSC%" /nologo /target:winexe /win32manifest:"%DIR%\app.manifest" /win32icon:"%DIR%\greenC.ico" ^
  /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Management.dll ^
  /r:System.Web.Extensions.dll ^
  /out:"%OUT%" "%DIR%\StartControllers.cs"
if %errorlevel%==0 (
  echo ===== BUILD OK: %OUT% =====
) else (
  echo ===== BUILD FAILED - see errors above =====
)
pause
