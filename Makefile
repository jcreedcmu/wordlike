# build and watch
watch:
	test -e node_modules || npm i
	node build.js watch

# build without watching
build:
	test -e node_modules || npm i
	node build.js

# run local server
serve:
	cd public && python3 -m http.server

# run typechecker
check:
	npx tsc --watch

# run tests
test:
	npm test

count:
	ag -g 'c$$|cc$$|hh$$|tsx?$$|frag$$|vert$$' --ignore='tests' | xargs wc -l

# deploy to github pages
deploy:
	git push origin "main:deploy"
