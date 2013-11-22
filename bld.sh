#!/bin/bash

# build TiddlyWiki5 for five.tiddlywiki.com

# Set up the build output directory

if [  -z "$TW5_BUILD_OUTPUT" ]; then
    TW5_BUILD_OUTPUT=../jermolene.github.com
fi

if [  ! -d "$TW5_BUILD_OUTPUT" ]; then
    echo 'A valid TW5_BUILD_OUTPUT environment variable must be set'
    exit 1
fi

echo "Using TW5_BUILD_OUTPUT as [$TW5_BUILD_OUTPUT]"

# Make the CNAME file that GitHub Pages requires

echo "five.tiddlywiki.com" > $TW5_BUILD_OUTPUT/CNAME

# Create the `static` directory if necessary

mkdir -p $TW5_BUILD_OUTPUT/static

# Delete any existing content

rm $TW5_BUILD_OUTPUT/static/*

# First,
#  readme.md: the readme file for GitHub
#  index.html: the main file, including content
#  static.html: the static version of the default tiddlers

node ./tiddlywiki.js \
	./editions/tw5.com \
	--verbose \
	--rendertiddler ReadMe ./readme.md text/html \
	--rendertiddler ContributingTemplate ./contributing.md text/html \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/index.html text/plain \
	--rendertiddler $:/core/templates/static.template.html $TW5_BUILD_OUTPUT/static.html text/plain \
	--rendertiddler $:/core/templates/static.template.css $TW5_BUILD_OUTPUT/static/static.css text/plain \
	--rendertiddlers [!is[system]] $:/core/templates/static.tiddler.html $TW5_BUILD_OUTPUT/static text/plain \
	|| exit 1

# Second, encrypted.html: a version of the main file encrypted with the password "password"

node ./tiddlywiki.js \
	./editions/tw5.com \
	--verbose \
	--password password \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/encrypted.html text/plain \
	|| exit 1

# Third, empty.html: empty wiki for reuse

node ./tiddlywiki.js \
	./editions/empty \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/empty.html text/plain \
	|| exit 1

# Fourth, tahoelafs.html: empty wiki with plugin for Tahoe-LAFS

node ./tiddlywiki.js \
	./editions/tahoelafs \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/tahoelafs.html text/plain \
	|| exit 1

# Fifth, d3demo.html: wiki to demo d3 plugin

node ./tiddlywiki.js \
	./editions/d3demo \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/d3demo.html text/plain \
	|| exit 1

# Sixth, codemirrordemo.html: wiki to demo codemirror plugin

node ./tiddlywiki.js \
	./editions/codemirrordemo \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/codemirrordemo.html text/plain \
	|| exit 1

# Seventh, codemirrordemo.html: wiki to demo codemirror plugin

node ./tiddlywiki.js \
	./editions/markdowndemo \
	--verbose \
	--rendertiddler $:/core/templates/tiddlywiki5.template.html $TW5_BUILD_OUTPUT/markdowndemo.html text/plain \
	|| exit 1

# Eighth, run the test edition to run the Node.js tests and to generate test.html for tests in the browser

./test.sh
