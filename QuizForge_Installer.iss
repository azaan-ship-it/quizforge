; QuizForge installer — build "npm run dist" first, then compile this in Inno Setup.
#define AppName "QuizForge"
#define AppVersion "1.2.0"
#define AppPublisher "ByteForge Studios"

[Setup]
AppId={{6E2B7C1A-4F2D-4C59-9B7E-A1B2C3D4E5F6}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=installer-output
OutputBaseFilename=QuizForge-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\QuizForge.exe
PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\QuizForge.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\QuizForge.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\QuizForge.exe"; Description: "Launch QuizForge"; Flags: nowait postinstall skipifsilent