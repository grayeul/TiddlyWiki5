#!/bin/bash
export TW5_BUILD_OUTPUT=$HOME/tw5
#./bld.sh
#	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/index.html text/plain \

node ./tiddlywiki.js \
	./editions/boblocal \
	--verbose \
	--rendertiddler ReadMe ./readme.md text/html \
	--rendertiddler ContributingTemplate ./contributing.md text/html \
	--rendertiddler $:/core/save/all $TW5_BUILD_OUTPUT/index.html text/plain \
	--rendertiddler $:/core/templates/static.template.html $TW5_BUILD_OUTPUT/static.html text/plain \
	--rendertiddler $:/core/templates/static.template.css $TW5_BUILD_OUTPUT/static/static.css text/plain \
	--rendertiddlers [!is[system]] $:/core/templates/static.tiddler.html $TW5_BUILD_OUTPUT/static text/plain \
	|| exit 1

node ./tiddlywiki.js \
	./editions/empty \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/empty.html text/plain \
	|| exit 1
