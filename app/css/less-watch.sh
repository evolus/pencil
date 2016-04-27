#!/bin/sh

cd `dirname $0`
DIR=`pwd`

lessc pencil.less pencil.css

while inotifywait -r $DIR; do lessc pencil.less pencil.css; done
