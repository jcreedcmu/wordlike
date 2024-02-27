const fs = require('fs');
const path = require('path');

function normalize(x) {
  return x.replace(/^\/src\//, '');
}

const edges = fs.readFileSync('/tmp/edges', 'utf8').split('\n').filter(x => x.length > 0).map(line => {
  let m;
  if (m = line.match(/(.*):(.*)/)) {
    const src = '/' + m[1].replace(/\.tsx?$/, '');
    const tgt = path.resolve(path.dirname(src), m[2]);
    return {src: normalize(src), tgt: normalize(tgt)}
  }
  else {
    throw new Error(`Can't parse ${line}`);
  }
});

const deps = {};
const seen = {};
edges.forEach(({src, tgt}) => {
  seen[src] = 1;
  seen[tgt] = 1;
  if (!deps[src])
    deps[src] = [];
  deps[src].push(tgt);
});

class Cycle extends Error {}
function getDepth(x, path) {
  if (path == undefined)
    path = [];
  if (path.includes(x)) {
    throw new Cycle(`cycle detected:\n${[...path, x].map(x => ' ' + x).join("\n")}`);
  }
  if (deps[x] == undefined)
    return 0;
  return 1 + deps[x].map(d => getDepth(d, [...path, x]));
}

// console.log(JSON.stringify(deps));

try {
Object.keys(seen).forEach(file => {
  console.log(`${file}: ${getDepth(file)}`);
});
}
catch (e) {
  if (e instanceof Cycle)
    console.log(e.message);
  else
    throw e;
}
