// Carbon emission per query in grams of CO2
export const CARBON_PER_QUERY = {
  gemini: 1.6,
  claude: 3.5,
  perplexity: 4.0,
  chatgpt: 4.4,
  google_search: 0.2,
};

// Platform display names
export const PLATFORM_NAMES = {
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  google_search: 'Google Search',
};

// Hostname-to-platform mapping for content script detection
export const SITE_CONFIG = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'www.perplexity.ai': 'perplexity',
  'perplexity.ai': 'perplexity',
  'www.google.com': 'google_search',
  'google.com': 'google_search',
};
