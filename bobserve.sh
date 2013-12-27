#!/bin/bash

# serve TiddlyWiki5 over HTTP

# Optional parameter is the username for signing edits
#	--server 8888 $:/core/templates/tiddlywiki5.template.html text/plain text/html BobRobison\

node ./tiddlywiki.js \
	editions/clientserver \
	--verbose \
	--server 8080 $:/core/save/all text/plain text/html BobRobison\
	|| exit 1
