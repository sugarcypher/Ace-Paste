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
    wordExchanges: number;
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

export interface WordExchange {
  id: string;
  badWord: string;
  goodWord: string;
  enabled: boolean;
}

export interface VarianceSettings {
  enabled: boolean;
  synonymVariation: boolean;
  caseVariation: boolean;
  pluralVariation: boolean;
}

export interface CleaningOptions {
  invisibleChars: boolean;
  markdownHeaders: boolean;
  markdownBold: boolean;
  repeatingChars: boolean;
  formattingLines: boolean;
  extraWhitespace: boolean;
  wordExchanges: boolean;
}

export interface ScanResult {
  text: string;
  confidence: number;
  language?: string;
}