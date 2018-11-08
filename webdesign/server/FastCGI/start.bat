@echo off
set SCRIPTPATH=%~dp0
set NODE_HOME=D:\software\Node.js\node-v8.9.2-win-x64
set PATH=%PATH%;%NODE_HOME%

if not exist %NODE_HOME% (
   echo Home folder "%NODE_HOME%" of node.js does not exist!
   pause
   exit 1
)

cd /d %SCRIPTPATH%
node FcgiListener.js

IF %ERRORLEVEL% NEQ 0 ( 
   pause
)