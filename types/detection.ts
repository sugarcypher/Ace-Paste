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
  additionalCleaning?: {
    markdownHeaders: number;
    markdownBold: number;
    repeatingChars: number;
    formattingLines: number;
    extraWhitespace: number;
  };
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

export interface CleaningOptions {
  invisibleChars: boolean;
  markdownHeaders: boolean;
  markdownBold: boolean;
  repeatingChars: boolean;
  formattingLines: boolean;
  extraWhitespace: boolean;
}

export interface ScanResult {
  text: string;
  confidence: number;
  language?: string;
}