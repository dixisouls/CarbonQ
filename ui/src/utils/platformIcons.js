/**
 * Platform icon paths
 */
const ICON_PATHS = {
  gemini: '/icons/gemini.svg',
  chatgpt: '/icons/chatgpt.svg',
  claude: '/icons/claude.svg',
  perplexity: '/icons/perplexity.svg',
  google_search: '/icons/google-search.svg',
};

/**
 * Get the icon component for a platform
 */
export const getPlatformIcon = (platformKey, size = 20) => {
  const iconPath = ICON_PATHS[platformKey] || ICON_PATHS.google_search;
  
  return (
    <img 
      src={iconPath} 
      alt={platformKey}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
};
