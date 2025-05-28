
// src/utils/preview.js

/**
 * Check if current request is in preview/draft mode
 */
export function isDraftMode(request) {
  if (!request || !request.url) {
    return false;
  }
  
  try {
    const url = new URL(request.url);
    return url.searchParams.get('preview') === 'true';
  } catch (error) {
    // If URL parsing fails, default to false
    console.warn('Failed to parse URL for preview mode:', error.message);
    return false;
  }
}

/**
 * Get content filter based on preview mode
 */
export function getContentFilter(isDraft = false) {
  if (isDraft) {
    // Show both published and draft content in preview mode
    return {
      status: {
        _in: ['published', 'draft']
      }
    };
  } else {
    // Normal mode - only published content
    return {
      status: {
        _eq: 'published'
      }
    };
  }
}

/**
 * Create preview URL by adding/removing preview parameter
 */
export function createPreviewUrl(currentUrl, isPreview = true) {
  try {
    const url = new URL(currentUrl);
    
    if (isPreview) {
      url.searchParams.set('preview', 'true');
    } else {
      url.searchParams.delete('preview');
    }
    
    return url.toString();
  } catch (error) {
    console.warn('Failed to create preview URL:', error.message);
    return currentUrl;
  }
}

/**
 * Generate shareable preview links
 */
export function generatePreviewLink(slug, type = 'lab', baseUrl = null) {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${base}/${type}s/${slug}?preview=true`;
}