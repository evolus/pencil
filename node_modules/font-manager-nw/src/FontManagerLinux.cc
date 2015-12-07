#include <fontconfig/fontconfig.h>
#include "FontDescriptor.h"

int convertWeight(FontWeight weight) {
  switch (weight) {
    case FontWeightThin:
      return FC_WEIGHT_THIN;
    case FontWeightUltraLight:
      return FC_WEIGHT_ULTRALIGHT;
    case FontWeightLight:
      return FC_WEIGHT_LIGHT;
    case FontWeightNormal:
      return FC_WEIGHT_REGULAR;
    case FontWeightMedium:
      return FC_WEIGHT_MEDIUM;
    case FontWeightSemiBold:
      return FC_WEIGHT_SEMIBOLD;
    case FontWeightBold:
      return FC_WEIGHT_BOLD;
    case FontWeightUltraBold:
      return FC_WEIGHT_EXTRABOLD;
    case FontWeightHeavy:
      return FC_WEIGHT_ULTRABLACK;
    default:
      return FC_WEIGHT_REGULAR;
  }
}

FontWeight convertWeight(int weight) {
  switch (weight) {
    case FC_WEIGHT_THIN:
      return FontWeightThin;
    case FC_WEIGHT_ULTRALIGHT:
      return FontWeightUltraLight;
    case FC_WEIGHT_LIGHT:
      return FontWeightLight;
    case FC_WEIGHT_REGULAR:
      return FontWeightNormal;
    case FC_WEIGHT_MEDIUM:
      return FontWeightMedium;
    case FC_WEIGHT_SEMIBOLD:
      return FontWeightSemiBold;
    case FC_WEIGHT_BOLD:
      return FontWeightBold;
    case FC_WEIGHT_EXTRABOLD:
      return FontWeightUltraBold;
    case FC_WEIGHT_ULTRABLACK:
      return FontWeightHeavy;
    default:
      return FontWeightNormal;
  }
}

int convertWidth(FontWidth width) {
  switch (width) {
    case FontWidthUltraCondensed:
      return FC_WIDTH_ULTRACONDENSED;
    case FontWidthExtraCondensed:
      return FC_WIDTH_EXTRACONDENSED;
    case FontWidthCondensed:
      return FC_WIDTH_CONDENSED;
    case FontWidthSemiCondensed:
      return FC_WIDTH_SEMICONDENSED;
    case FontWidthNormal:
      return FC_WIDTH_NORMAL;
    case FontWidthSemiExpanded:
      return  FC_WIDTH_SEMIEXPANDED;
    case FontWidthExpanded:
      return FC_WIDTH_EXPANDED;
    case FontWidthExtraExpanded:
      return FC_WIDTH_EXTRAEXPANDED;
    case FontWidthUltraExpanded:
      return FC_WIDTH_ULTRAEXPANDED;
    default:
      return FC_WIDTH_NORMAL;
  }
}

FontWidth convertWidth(int width) {
  switch (width) {
    case FC_WIDTH_ULTRACONDENSED:
      return FontWidthUltraCondensed;
    case FC_WIDTH_EXTRACONDENSED:
      return FontWidthExtraCondensed;
    case FC_WIDTH_CONDENSED:
      return FontWidthCondensed;
    case FC_WIDTH_SEMICONDENSED:
      return FontWidthSemiCondensed;
    case FC_WIDTH_NORMAL:
      return FontWidthNormal;
    case FC_WIDTH_SEMIEXPANDED:
      return FontWidthSemiExpanded;
    case FC_WIDTH_EXPANDED:
      return FontWidthExpanded;
    case FC_WIDTH_EXTRAEXPANDED:
      return FontWidthExtraExpanded;
    case FC_WIDTH_ULTRAEXPANDED:
      return FontWidthUltraExpanded;
    default:
      return FontWidthNormal;
  }
}

FontDescriptor *createFontDescriptor(FcPattern *pattern) {
  FcChar8 *path, *psName, *family, *style;
  int weight, width, slant, spacing;

  FcPatternGetString(pattern, FC_FILE, 0, &path);
  FcPatternGetString(pattern, FC_POSTSCRIPT_NAME, 0, &psName);
  FcPatternGetString(pattern, FC_FAMILY, 0, &family);
  FcPatternGetString(pattern, FC_STYLE, 0, &style);

  FcPatternGetInteger(pattern, FC_WEIGHT, 0, &weight);
  FcPatternGetInteger(pattern, FC_WIDTH, 0, &width);
  FcPatternGetInteger(pattern, FC_SLANT, 0, &slant);
  FcPatternGetInteger(pattern, FC_SPACING, 0, &spacing);

  return new FontDescriptor(
    (char *) path,
    (char *) psName,
    (char *) family,
    (char *) style,
    convertWeight(weight),
    convertWidth(width),
    slant == FC_SLANT_ITALIC,
    spacing == FC_MONO
  );
}

ResultSet *getResultSet(FcFontSet *fs) {
  ResultSet *res = new ResultSet();
  if (!fs)
    return res;

  for (int i = 0; i < fs->nfont; i++) {
    res->push_back(createFontDescriptor(fs->fonts[i]));
  }

  return res;
}

ResultSet *getAvailableFonts() {
  FcInit();

  FcPattern *pattern = FcPatternCreate();
  FcObjectSet *os = FcObjectSetBuild(FC_FILE, FC_POSTSCRIPT_NAME, FC_FAMILY, FC_STYLE, FC_WEIGHT, FC_WIDTH, FC_SLANT, FC_SPACING, NULL);
  FcFontSet *fs = FcFontList(NULL, pattern, os);
  ResultSet *res = getResultSet(fs);
  
  FcPatternDestroy(pattern);
  FcObjectSetDestroy(os);
  FcFontSetDestroy(fs);

  return res;
}


FcPattern *createPattern(FontDescriptor *desc) {
  FcInit();
  FcPattern *pattern = FcPatternCreate();

  if (desc->postscriptName)
    FcPatternAddString(pattern, FC_POSTSCRIPT_NAME, (FcChar8 *) desc->postscriptName);

  if (desc->family)
    FcPatternAddString(pattern, FC_FAMILY, (FcChar8 *) desc->family);

  if (desc->style)
    FcPatternAddString(pattern, FC_STYLE, (FcChar8 *) desc->style);

  if (desc->italic)
    FcPatternAddInteger(pattern, FC_SLANT, FC_SLANT_ITALIC);

  if (desc->weight)
    FcPatternAddInteger(pattern, FC_WEIGHT, convertWeight(desc->weight));

  if (desc->width)
    FcPatternAddInteger(pattern, FC_WIDTH, convertWidth(desc->width));

  if (desc->monospace)
    FcPatternAddInteger(pattern, FC_SPACING, FC_MONO);

  return pattern;
}

ResultSet *findFonts(FontDescriptor *desc) {
  FcPattern *pattern = createPattern(desc);
  FcObjectSet *os = FcObjectSetBuild(FC_FILE, FC_POSTSCRIPT_NAME, FC_FAMILY, FC_STYLE, FC_WEIGHT, FC_WIDTH, FC_SLANT, FC_SPACING, NULL);
  FcFontSet *fs = FcFontList(NULL, pattern, os);
  ResultSet *res = getResultSet(fs);

  FcFontSetDestroy(fs);
  FcPatternDestroy(pattern);
  FcObjectSetDestroy(os);

  return res;
}

FontDescriptor *findFont(FontDescriptor *desc) {
  FcPattern *pattern = createPattern(desc);
  FcConfigSubstitute(NULL, pattern, FcMatchPattern);
  FcDefaultSubstitute(pattern);

  FcResult result;
  FcPattern *font = FcFontMatch(NULL, pattern, &result);
  FontDescriptor *res = createFontDescriptor(font);

  FcPatternDestroy(pattern);
  FcPatternDestroy(font);

  return res;
}

FontDescriptor *substituteFont(char *postscriptName, char *string) {
  FcInit();

  // create a pattern with the postscript name
  FcPattern* pattern = FcPatternCreate();
  FcPatternAddString(pattern, FC_POSTSCRIPT_NAME, (FcChar8 *) postscriptName);

  // create a charset with each character in the string
  FcCharSet* charset = FcCharSetCreate();
  int len = strlen(string);

  for (int i = 0; i < len;) {
    FcChar32 c;
    i += FcUtf8ToUcs4((FcChar8 *)string + i, &c, len - i);
    FcCharSetAddChar(charset, c);
  }

  FcPatternAddCharSet(pattern, FC_CHARSET, charset);
  FcCharSetDestroy(charset);

  FcConfigSubstitute(0, pattern, FcMatchPattern);
  FcDefaultSubstitute(pattern);

  // find the best match font
  FcResult result;
  FcPattern *font = FcFontMatch(NULL, pattern, &result);
  FontDescriptor *res = createFontDescriptor(font);

  FcPatternDestroy(pattern);
  FcPatternDestroy(font);

  return res;
}
