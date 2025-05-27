// src/utils/lab_colorUtils.js

/**
 * Converts a hex color to RGB components
 * @param {string} hex - Hex color code (with or without #)
 * @returns {Object} RGB values as {r, g, b}
 */
export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  let r, g, b;
  if (hex.length === 3) {
    // Short notation (e.g. #ABC)
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (hex.length === 6) {
    // Full notation (e.g. #AABBCC)
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // Invalid hex, return black
    console.error('Invalid hex color:', hex);
    return { r: 0, g: 0, b: 0 };
  }
  
  return { r, g, b };
}

/**
 * Calculates the relative luminance of a color
 * @param {Object} rgb - RGB values {r, g, b}
 * @returns {number} Luminance value between 0 and 1
 */
export function calculateLuminance(rgb) {
  // Convert RGB to sRGB
  const srgb = {
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255
  };
  
  // Apply gamma correction
  const gammaCorrected = {
    r: srgb.r <= 0.03928 ? srgb.r / 12.92 : Math.pow((srgb.r + 0.055) / 1.055, 2.4),
    g: srgb.g <= 0.03928 ? srgb.g / 12.92 : Math.pow((srgb.g + 0.055) / 1.055, 2.4),
    b: srgb.b <= 0.03928 ? srgb.b / 12.92 : Math.pow((srgb.b + 0.055) / 1.055, 2.4)
  };
  
  // Calculate luminance according to WCAG formula
  return 0.2126 * gammaCorrected.r + 0.7152 * gammaCorrected.g + 0.0722 * gammaCorrected.b;
}

/**
 * Calculates contrast ratio between two luminance values
 * @param {number} luminance1 - First color's luminance
 * @param {number} luminance2 - Second color's luminance
 * @returns {number} Contrast ratio between 1 and 21
 */
export function calculateContrastRatio(luminance1, luminance2) {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if text should be white or black based on background color
 * @param {string} bgColorHex - Background color hex code
 * @returns {string} '#FFFFFF' for white or '#000000' for black text
 */
export function getTextColorForBackground(bgColorHex) {
  if (!bgColorHex) return '#000000';
  
  const rgb = hexToRgb(bgColorHex);
  const luminance = calculateLuminance(rgb);
  
  // WCAG recommends contrast ratio of at least 4.5:1 for normal text
  // White text on the background
  const whiteContrast = calculateContrastRatio(1, luminance);
  
  // Black text on the background
  const blackContrast = calculateContrastRatio(0, luminance);
  
  // Choose the color with better contrast
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Generates a complementary accent color for a primary color
 * @param {string} primaryColorHex - Primary color hex code
 * @returns {string} Complementary accent color
 */
export function generateAccentColor(primaryColorHex) {
  if (!primaryColorHex) return '#FFA360'; // UK sunset
  
  const rgb = hexToRgb(primaryColorHex);
  
  // Simple complementary color (add 180 degrees in hue)
  // Convert RGB to HSL
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  // Rotate hue by 180 degrees for complementary color
  h = (h + 0.5) % 1;
  
  // Adjust saturation and lightness for better accent color
  s = Math.min(1, s * 1.2); // Increase saturation slightly
  l = Math.max(0.3, Math.min(0.7, l)); // Keep lightness moderate
  
  // Convert back to RGB
  let r2, g2, b2;
  
  if (s === 0) {
    r2 = g2 = b2 = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r2 = hue2rgb(p, q, h + 1/3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1/3);
  }
  
  // Convert to hex
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

/**
 * Generates color variables for lab styles with automatic contrast checking
 * @param {Object} lab - Lab object with color properties
 * @returns {Object} Color variables with contrast adjustments
 */
export function generateLabColorVariables(lab) {
  // Default colors
  const defaultPrimary = '#0033A0';  // UK Blue
  const defaultSecondary = '#B1C9E8'; // UK Sky
  const defaultBackground = '#f9fafb'; // Light gray
  
  // Get colors from lab or use defaults

  // Get color properties, with fallbacks
  const primaryColor = lab?.primary_color || defaultPrimary;
  const secondaryColor = lab?.secondary_color || defaultSecondary;
  const backgroundColor = lab?.background_color || defaultBackground;
 
  // Determine text colors for different backgrounds
  const textOnPrimary = getTextColorForBackground(primaryColor);
  const textOnSecondary = getTextColorForBackground(secondaryColor);
  const textOnBackground = getTextColorForBackground(backgroundColor);
  
  // Generate an accent color if none provided
  const accentColor = lab?.accent_color || generateAccentColor(primaryColor);
  
  // Return the color variables
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    textOnPrimary,
    textOnSecondary,
    textOnBackground
  };
}