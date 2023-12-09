#include <stdio.h>
#define STB_TRUETYPE_IMPLEMENTATION
#include "../vendor/stb_truetype.h"

int main(void) {
  stbtt_fontinfo font;
  unsigned char ttf_buffer[1<<20];

  fread(ttf_buffer, 1, 1<<25, fopen("/home/jcreed/.fonts/Birbaslo.ttf", "rb"));

  stbtt_InitFont(&font, ttf_buffer, stbtt_GetFontOffsetForIndex(ttf_buffer,0));

  int height = 128;
  int width = 128;
  int xoff = 64;
  int yoff = 64;
  unsigned char *bitmap = stbtt_GetCodepointSDF(&font,
                                                12, /*scale*/
                                                65, /* int codepoint */
                                                5, /* int padding */
                                                128, /* unsigned char onedge_value */
                                                1.0, /* float pixel_dist_scale */
                                                &width, /* int *width */
                                                &height, /* int *height */
                                                &xoff, /* int *xoff */
                                                &yoff  /* int *yoff */
                                                );

  for (int i = 0; i < 128; i++) {
    printf("%d ", bitmap[i]);
  }
  stbtt_FreeSDF(bitmap, (void *)0 /*void *userdata*/);

}
