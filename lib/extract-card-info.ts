// Utility functions for extracting business card information from OCR text

export interface CardInfo {
  fullName?: string;
  companyName?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  website?: string;
}

// Check if text contains Japanese characters (Hiragana, Katakana, or Kanji)
function isJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// Check if text is primarily English (Latin alphabet)
function isEnglish(text: string): boolean {
  return /^[A-Za-z\s.'-]+$/.test(text);
}

// Check if line is likely a name (Japanese or English, exclude Chinese-only names)
function isLikelyName(line: string): boolean {
  // Too short or too long to be a name
  if (line.length < 2 || line.length > 30) return false;

  // Check if it's English name (Latin alphabet only)
  if (isEnglish(line)) {
    // Should have at least 2 words (First Last)
    const words = line.trim().split(/\s+/);
    return words.length >= 2 && words.length <= 4;
  }

  // Check if it contains Japanese characters
  if (isJapanese(line)) {
    // Japanese names are typically 2-5 characters
    return line.length >= 2 && line.length <= 5;
  }

  // Exclude lines with only Chinese characters or numbers
  return false;
}

export function extractBusinessCardInfo(text: string): CardInfo {
  const result: CardInfo = {};

  // Email regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Phone regex (Japanese and international formats)
  const phoneRegex = /(?:(?:\+?81|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4})/gi;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    result.phone = phoneMatches[0];
    if (phoneMatches.length > 1) {
      result.mobile = phoneMatches[1];
    }
  }

  // Website/URL regex
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi;
  const urlMatch = text.match(urlRegex);
  if (urlMatch) {
    result.website = urlMatch[0];
  }

  // Extract lines for name, company, position detection
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Look for company indicators first
  const companyKeywords = ['株式会社', '有限会社', '合同会社', 'Corporation', 'Inc.', 'Ltd.', 'LLC', 'Co.'];
  for (const line of lines) {
    if (companyKeywords.some(keyword => line.includes(keyword))) {
      result.companyName = line;
      break;
    }
  }

  // Look for position indicators
  const positionKeywords = ['部長', '課長', '社長', '取締役', '代表', 'Manager', 'Director', 'CEO', 'CTO', 'President'];
  for (const line of lines) {
    if (positionKeywords.some(keyword => line.includes(keyword))) {
      result.position = line;
      break;
    }
  }

  // Look for department
  const deptKeywords = ['部', '課', 'Department', 'Dept'];
  for (const line of lines) {
    if (deptKeywords.some(keyword => line.includes(keyword)) && line !== result.position) {
      result.department = line;
      break;
    }
  }

  // Find name - look for likely name that's not company, position, or department
  for (const line of lines) {
    // Skip if it's already identified as company, position, or department
    if (line === result.companyName || line === result.position || line === result.department) {
      continue;
    }

    // Skip if it contains email or phone number
    if (emailRegex.test(line) || phoneRegex.test(line)) {
      continue;
    }

    // Check if it's a likely name
    if (isLikelyName(line)) {
      result.fullName = line;
      break;
    }
  }

  // Fallback: if no name found, use first line that's not company/position/dept
  if (!result.fullName && lines.length > 0) {
    for (const line of lines) {
      if (line !== result.companyName && line !== result.position && line !== result.department) {
        result.fullName = line;
        break;
      }
    }
  }

  return result;
}
