@echo off
set SCRIPTPATH=%~dp0
set GIT_HOME=D:\software\Git\PortableGit\cmd
set NODE_HOME=D:\software\Node.js\node-v8.9.2-win-x64
set PATH=%PATH%;%GIT_HOME%;%NODE_HOME%

if not exist %GIT_HOME% (
   echo Home folder "%GIT_HOME%" of GIT does not exist!
   pause
   exit 1
)

if not exist %NODE_HOME% (
   echo Home folder "%NODE_HOME%" of node.js does not exist!
   pause
   exit 1
)

echo %SCRIPTPATH%
start cmd /k cd /d %SCRIPTPATH%