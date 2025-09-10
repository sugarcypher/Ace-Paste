export interface DetectionResult {
  totalCount: number;
  categories: {
    ZERO_WIDTH: number;
    BIDI_CONTROLS: number;
    MATH_OPERATORS: number;
    HYPHENATION: number;
    VARIATION_SELECTORS: number;
    FORMAT_CONTROLS: number;
    SHORTHAND: number;
    TAG_CHARACTERS: number;
    IVS_CHARACTERS: number;
  };
  positions: number[];
}

export interface InvisibleCharacterMap {
  ZERO_WIDTH: number[];
  BIDI_CONTROLS: number[];
  MATH_OPERATORS: number[];
  HYPHENATION: number[];
  VARIATION_SELECTORS: number[];
  FORMAT_CONTROLS: number[];
  SHORTHAND: number[];
}