#include <stdio.h>
#define STB_TRUETYPE_IMPLEMENTATION
#include "../vendor/stb_truetype.h"

int main(void) {
  stbtt_fontinfo font;
  unsigned char ttf_buffer[1<<20];

  fread(ttf_buffer, 1, 1<<25, fopen("/home/jcreed/.fonts/Birbaslo.ttf", "rb"));

  stbtt_InitFont(&font, ttf_buffer, stbtt_GetFontOffsetForIndex(ttf_buffer,0));

  int height;
  int width;
  int xoff;
  int yoff;
  int glyph = stbtt_FindGlyphIndex(&font, 0x2603);
  unsigned char *bitmap = stbtt_GetGlyphSDF(&font,
                                            stbtt_ScaleForPixelHeight(&font, 96), /*scale*/
                                                glyph, /* glyph index */
                                                5, /* int padding */
                                                180, /* unsigned char onedge_value */
                                                36.0, /* float pixel_dist_scale */
                                                &width, /* int *width */
                                                &height, /* int *height */
                                                &xoff, /* int *xoff */
                                                &yoff  /* int *yoff */
                                                );
  printf("P2 %d %d 255\n", width, height);
  for (int i = 0; i < height; i++) {
    for (int j = 0; j < width; j++) {
      printf("%d ", bitmap[i * width + j]);
    }
    printf("\n");
  }
  stbtt_FreeSDF(bitmap, (void *)0 /*void *userdata*/);

}
