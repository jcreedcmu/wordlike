#!/bin/bash

FILES=`find src -not -path "*node_modules*" | egrep '\.tsx?$'`
perl -lne '/import .* from .(\..*).;/ and print "$ARGV:$1"' $FILES > /tmp/edges
node precompute/deps/analyze.js
