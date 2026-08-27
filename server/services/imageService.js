import fetch from 'node-fetch';

/**
 * AI Image Generation Service
 * Supports Pollinations AI (FLUX / SDXL free real-time image generation)
 * with fallback to OpenAI DALL-E if configured in .env.
 */

// Regex patterns to detect image generation intent
const IMAGE_GEN_PATTERNS = [
  /^(?:please\s+)?(?:generate|create|draw|paint|make|render|show)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|pic)\s+(?:of|about|showing|with)?\s*(.+)$/i,
  /^(?:generate|create|draw|make)\s+(?:an?\s+)?(.+)\s+(?:image|picture|photo|illustration)$/i,
  /^(?:image|picture|photo|drawing|artwork)\s+(?:of|showing)\s+(.+)$/i,
  /^(?:generate|create|draw)\s+image\s+(.+)$/i
];

/**
 * Determines if a user prompt is asking to generate an image.
 * @param {string} prompt 
 * @returns {boolean}
 */
export function isImageGenerationPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  const lower = prompt.trim().toLowerCase();

  // Explicit check for generate image / draw / create image keywords
  if (
    lower.includes('generate image') ||
    lower.includes('generate an image') ||
    lower.includes('create an image') ||
    lower.includes('create image') ||
    lower.includes('draw an image') ||
    lower.includes('draw a picture') ||
    lower.includes('draw image') ||
    lower.includes('make an image') ||
    lower.includes('make a picture') ||
    lower.includes('generate picture') ||
    lower.includes('picture of') && (lower.startsWith('generate') || lower.startsWith('create') || lower.startsWith('draw') || lower.startsWith('show') || lower.startsWith('make')) ||
    lower.includes('image of') && (lower.startsWith('generate') || lower.startsWith('create') || lower.startsWith('draw') || lower.startsWith('show') || lower.startsWith('make'))
  ) {
    return true;
  }

  return IMAGE_GEN_PATTERNS.some(pattern => pattern.test(lower));
}

/**
 * Extracts the core subject/description for image generation from user prompt.
 * @param {string} prompt 
 * @returns {string} Cleaned prompt for image generator
 */
export function extractImageSubject(prompt) {
  if (!prompt) return 'a majestic pirate ship sailing on a stormy ocean at sunset';

  let cleaned = prompt.trim();

  for (const pattern of IMAGE_GEN_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      cleaned = match[1].trim();
      break;
    }
  }

  // Strip residual command prefixes if still present
  cleaned = cleaned
    .replace(/^(?:please|can you|could you)\s+/i, '')
    .replace(/^(?:generate|create|draw|paint|make|render|show)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|pic)\s+(?:of|about|showing|with)?\s*/i, '')
    .replace(/^(?:image|picture|photo)\s+(?:of|showing)?\s*/i, '')
    .trim();

  return cleaned || prompt.trim();
}

/**
 * Call OpenAI DALL-E API if OPENAI_API_KEY is configured
 */
async function callOpenAIDallE(subject) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: subject,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data[0]?.url) {
        return {
          url: data.data[0].url,
          provider: 'OpenAI DALL-E 3',
          revisedPrompt: data.data[0].revised_prompt || subject
        };
      }
    }
  } catch (err) {
    console.warn('[DALL-E 3] Image generation call skipped:', err.message);
  }

  return null;
}

/**
 * Generate AI Image from prompt using Pollinations AI (or DALL-E fallback)
 * @param {string} prompt 
 * @returns {Promise<string>} Formatted Markdown result containing image
 */
export async function generateAIImage(prompt) {
  const subject = extractImageSubject(prompt);
  console.log(`[Image Generation Service] 🎨 Generating AI image for prompt: "${subject}"`);

  // 1. Try OpenAI DALL-E 3 if API key exists
  const dallEResult = await callOpenAIDallE(subject);
  if (dallEResult) {
    return `🎨 **AI Image Generated Successfully!**

**Prompt**: "${dallEResult.revisedPrompt || subject}"  
**Engine**: ${dallEResult.provider} (1024x1024 HD)

![AI Generated Image: ${subject}](${dallEResult.url})

---
*💡 Tip: Click on the image to view in full resolution, download, or copy URL!*`;
  }

  // 2. Pollinations AI (Instant, free, FLUX/SDXL quality real-time text-to-image)
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(subject);
  
  // High quality parameters
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;

  return `🎨 **AI Image Generated Successfully!**

**Subject**: "${subject}"  
**Engine**: Pollinations AI (FLUX / Stable Diffusion XL 1024x1024)  
**Seed**: \`${seed}\`

![AI Generated Image: ${subject}](${imageUrl})

---
*💡 Tip: Click on the image to open Lightbox view, download to your PC, or copy the direct link! You can also try: "Generate an image of ${subject} in digital art style"*`;
}
