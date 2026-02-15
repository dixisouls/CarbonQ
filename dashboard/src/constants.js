// Carbon emission per query in grams of CO2
export const CARBON_PER_QUERY = {
  gemini: 1.6,
  claude: 3.5,
  perplexity: 4.0,
  chatgpt: 4.4,
};

// Platform display names
export const PLATFORM_NAMES = {
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
};

// Platform colors for charts
export const PLATFORM_COLORS = {
  chatgpt: '#10b981',
  claude: '#f59e0b',
  gemini: '#3b82f6',
  perplexity: '#8b5cf6',
};

// Platform icons (emoji fallback)
export const PLATFORM_ICONS = {
  chatgpt: '🤖',
  claude: '🧠',
  gemini: '✨',
  perplexity: '🔍',
};
