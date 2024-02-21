../../public/assets/font-sheet.png: precompute-font
	./precompute-font
	convert /tmp/font-sheet.ppm ../../public/assets/font-sheet.png

precompute-font: precompute-font.c ../../vendor/stb_truetype.h
	gcc -o precompute-font precompute-font.c -lm
