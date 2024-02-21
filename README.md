Wordlike
========

Demo
----
Play online: https://jcreedcmu.github.io/wordlike/

[![image](screenshot.png)](https://jcreedcmu.github.io/wordlike/)

This is a prototype of a tile-laying word game (like scrabble,
bananagrams, etc.) with some extra mechanics that enable expansion
across a large grid. Some influence coming from roguelikes, tower
defense games, etc.

Development
----------

In one shell, you can
```shell
make watch
```
to build the js bundle and in another
```shell
make serve
```
to start a local server on port 8000.

Browse to http://localhost:8000 to play the game.

Directory Structure
-------------------

| Directory | Description |
| --- | --- |
| [.github/workflows](.github/workflows) | Deploy scripts
| [precompute](precompute) | Scripts to precompute assets
| [public](public) | Static assets for browser version |
| [src/core](src/core) | State and state update code |
| [src/ui](src/ui) | Frontend code |
| [src/util](src/util) | Utilities |
| [tests](tests) | Unit tests |
| [vendor](vendor) | Vendored libraries (for now just stb's font library)
