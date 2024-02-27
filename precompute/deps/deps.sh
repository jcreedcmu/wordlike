#!/bin/bash

FILES=`find src -not -path "*node_modules*" | egrep '\.tsx?$'`
perl -lne '/import .* from .(\..*).;/ and print "$ARGV:$1"' $FILES > /tmp/edges
node precompute/deps/cleanup.js > /tmp/graph.dot
dot -Tpng /tmp/graph.dot -o /tmp/output.png
echo "created /tmp/output.png"
