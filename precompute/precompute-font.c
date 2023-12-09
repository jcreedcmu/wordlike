#include <stdio.h>
#define STB_TRUETYPE_IMPLEMENTATION
#include "../vendor/stb_truetype.h"

#define DEBUG 0

#define SPRITE_W 64
#define SPRITE_H 64
#define CELLS_W 8
#define CELLS_H 8
#define FINAL_W (SPRITE_W * CELLS_W)
#define FINAL_H (SPRITE_H * CELLS_H)
#define PADDING 5
#define ONEDGE 128

void  splat_letter(const stbtt_fontinfo *font, float scale, int codepoint, int sprite_x, int sprite_y, int ascent, char *final) {
  int height;
  int width;
  int xoff;
  int yoff;
  int glyph = stbtt_FindGlyphIndex(font, codepoint);

  int advance;
  int lsb;
  stbtt_GetCodepointHMetrics(font, codepoint, &advance, &lsb);

  unsigned char *bitmap = stbtt_GetGlyphSDF(font,
                                            scale, /*scale*/
                                            glyph, /* glyph index */
                                            PADDING, /* int padding */
                                            ONEDGE, /* unsigned char onedge_value */
                                            ONEDGE / (float)PADDING, /* float pixel_dist_scale */
                                            &width, /* int *width */
                                            &height, /* int *height */
                                            &xoff, /* int *xoff */
                                            &yoff  /* int *yoff */
                                            );

  int real_width = width - 2 * PADDING;
  int char_left = -xoff;
  int char_right = -xoff + scale * advance;
  if (DEBUG)
    fprintf(stderr, "advance %f lsb %f gap %d\n", scale * advance, scale * lsb, char_right - char_left);
  int char_baseline = -yoff;

  for (int sy = 0; sy < SPRITE_H; sy++) {
    for (int sx = 0; sx < SPRITE_W; sx++) {
      int lx = sx - xoff - (SPRITE_W  - advance * scale) / 2;
      int ly = sy - (SPRITE_H - ascent * scale) / 2;
      int x = sprite_x * SPRITE_W + sx;
      int y = sprite_y * SPRITE_H + sy;
      int ix = 3 * (y * FINAL_W + x);
      int lix = ly * width + lx;
      // The red channel is the authoritative SDF.
      // But we stick some other info in green and blue just for debugging.
      if (lx >= 0 && ly >= 0 && lx < width && ly < height) {
        final[ix + 0] = bitmap[lix];
        final[ix + 1] = bitmap[lix];
        final[ix + 2] = bitmap[lix];
      }
      else {
        final[ix + 0] = 0;
        final[ix + 1] = 0;
        final[ix + 2] = 255;
      }
      if ((lx >= char_left && lx <= char_right) && ly == char_baseline) {
        final[ix + 1] = 255;
        final[ix + 2] = 0;
      }
    }
  }

  stbtt_FreeSDF(bitmap, (void *)0 /*void *userdata*/);
}

int main(void) {
  stbtt_fontinfo font;
  unsigned char ttf_buffer[1<<20];
  unsigned char final[3 * FINAL_W * FINAL_H];
  FILE *fontfile = fopen("../public/assets/Birbaslo.ttf", "rb");
  if (!fontfile) {
    printf("Can't find font\n");
    exit(1);
  }
  fread(ttf_buffer, 1, 1<<25, fontfile);

  stbtt_InitFont(&font, ttf_buffer, stbtt_GetFontOffsetForIndex(ttf_buffer,0));

  int ascent;
  float scale = stbtt_ScaleForPixelHeight(&font, 55);
  stbtt_GetFontVMetrics(&font, &ascent,0,0);
  if (DEBUG) {
    fprintf(stderr, "ascent %f\n", ascent * scale);
  }

  for (int i = 0; i <= 25; i++) {
    splat_letter(&font, scale, 65 + i, i / CELLS_W, i % CELLS_W, ascent, final);
  }

  FILE *fsfp = fopen("/tmp/font-sheet.ppm", "w");
  fprintf(fsfp, "P3 %d %d 255\n", FINAL_W, FINAL_H);

  for (int i = 0; i < FINAL_W; i++) {
    for (int j = 0; j < FINAL_H; j++) {
      int ix = 3 * (i * FINAL_W + j);
      fprintf(fsfp, "%d %d %d\n", final[ix], final[ix+1], final[ix+2]);
    }
    fprintf(fsfp, "\n");
  }
  fclose(fsfp);

}
