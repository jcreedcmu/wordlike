bananagrams-tower-defense
=========================

![image](screenshot.png)

This is a prototype of a game idea that is principally a tile-laying
word game (like scrabble/bananagrams) with an extra layer involving
getting bonuses that enable expansion across a large grid. Maybe
purchasing bonuses with resources obtained by making words/layouts/etc.
At some point there was some inspiration from tower defense games, but
I'm not sure if that's survived.

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
| [public](public) | Static assets for browser version |
| [src](src) | Typescript code of the main body of the game |
| [tests](tests) | Unit tests |
