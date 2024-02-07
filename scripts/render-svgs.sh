#!/bin/bash

UI_FILL_REPL="#ff0000"
UI_STROKE_REPL="#0000ff"

UI_BG="#595959"
UI_FG="#ffffff"

LARGE_SIZE=128

WORKDIR=/tmp/svgs
mkdir -p ${WORKDIR}
for SVG in public/assets/svg/*.svg
do
  filename=$(basename $SVG)
  base=${filename%.*}
  perl -pe "s/${UI_FILL_REPL}/${UI_BG}/g; s/${UI_STROKE_REPL}/${UI_FG}/g;" public/assets/svg/${base}.svg >${WORKDIR}/${base}.svg
  inkscape -z -w ${LARGE_SIZE} -h ${LARGE_SIZE}  ${WORKDIR}/${base}.svg -e ${WORKDIR}/${base}.png
done

PNGS=$(echo "arrow hand dynamite bomb vowel consonant copy timer wood" | perl -ane "for (@F) {print qq(${WORKDIR}\/\$_.png )}")
echo $PNGS
montage $PNGS -background '#ffffff00' -tile 16x1 public/assets/toolbar-large.png
