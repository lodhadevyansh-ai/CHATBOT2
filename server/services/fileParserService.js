import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let pdfParseModule;
try {
  pdfParseModule = require('pdf-parse');
} catch (err) {
  console.warn('pdf-parse module load error:', err.message);
}

let mammothModule;
try {
  mammothModule = require('mammoth');
} catch (err) {
  console.warn('mammoth module load error:', err.message);
}

/**
 * Extracts text from PDF buffer using multi-version fallback (v1 function vs v2 PDFParse class)
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer) {
  if (!pdfParseModule) {
    throw new Error('PDF parser dependency is missing');
  }

  // Handle pdf-parse v1 function format
  if (typeof pdfParseModule === 'function') {
    const parsed = await pdfParseModule(buffer);
    return parsed && parsed.text ? parsed.text : '';
  }
  if (typeof pdfParseModule.default === 'function') {
    const parsed = await pdfParseModule.default(buffer);
    return parsed && parsed.text ? parsed.text : '';
  }

  // Handle pdf-parse v2 class format (PDFParse)
  const PDFParseClass = pdfParseModule.PDFParse || (pdfParseModule.default && pdfParseModule.default.PDFParse);
  if (PDFParseClass) {
    const parser = new PDFParseClass({ data: buffer });
    const result = await parser.getText();
    if (typeof result === 'string') return result;
    if (result && typeof result.text === 'string') return result.text;
    return String(result || '');
  }

  throw new Error('Compatible PDF parsing function not found in module');
}

/**
 * Parses an attached file payload (containing base64 data) and returns extracted text or image metadata.
 * @param {Object} attachment - { name, mimeType, data }
 * @returns {Promise<{ name: string, mimeType: string, isImage: boolean, text?: string, base64Data?: string, error?: string }>}
 */
export async function parseAttachment(attachment) {
  if (!attachment) {
    return { name: 'Unknown', mimeType: '', isImage: false, error: 'No attachment provided' };
  }

  const name = attachment.name || 'file';
  const mimeType = attachment.mimeType || attachment.type || '';
  const data = attachment.data;

  if (!data) {
    return { name, mimeType, isImage: false, error: 'Empty file data' };
  }

  // Convert base64 data to Buffer
  const base64Data = typeof data === 'string' && data.includes(',') ? data.split(',')[1] : data;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(base64Data, 'base64');

  // Check if image
  if ((mimeType && mimeType.startsWith('image/')) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) {
    return {
      name,
      mimeType: mimeType || 'image/jpeg',
      isImage: true,
      base64Data: base64Data.toString ? base64Data.toString('base64') : base64Data
    };
  }

  // PDF Document
  if ((mimeType && mimeType.includes('pdf')) || name.toLowerCase().endsWith('.pdf')) {
    try {
      const extractedText = await extractPdfText(buffer);
      return {
        name,
        mimeType: 'application/pdf',
        isImage: false,
        text: extractedText && extractedText.trim() ? extractedText.trim() : 'No extractable text found in PDF.'
      };
    } catch (err) {
      console.error(`Error parsing PDF "${name}":`, err.message);
      return {
        name,
        mimeType: 'application/pdf',
        isImage: false,
        text: `[Error extracting text from PDF file "${name}": ${err.message}]`
      };
    }
  }

  // Word Document (.docx / .doc)
  if (
    (mimeType && (mimeType.includes('word') || mimeType.includes('officedocument'))) ||
    name.toLowerCase().endsWith('.docx') ||
    name.toLowerCase().endsWith('.doc')
  ) {
    try {
      if (!mammothModule || typeof mammothModule.extractRawText !== 'function') {
        throw new Error('Mammoth Word parser not available');
      }
      const result = await mammothModule.extractRawText({ buffer });
      return {
        name,
        mimeType: 'application/docx',
        isImage: false,
        text: result && result.value ? result.value.trim() : 'No extractable text found in Word document.'
      };
    } catch (err) {
      console.error(`Error parsing Word file "${name}":`, err.message);
      return {
        name,
        mimeType: 'application/docx',
        isImage: false,
        text: `[Error extracting text from Word document "${name}": ${err.message}]`
      };
    }
  }

  // Plain Text, Code, JSON, Markdown, CSV, etc.
  try {
    const textContent = buffer.toString('utf-8');
    return {
      name,
      mimeType: mimeType || 'text/plain',
      isImage: false,
      text: textContent.trim()
    };
  } catch (err) {
    return {
      name,
      mimeType: mimeType || 'text/plain',
      isImage: false,
      text: `[Error reading text from file "${name}": ${err.message}]`
    };
  }
}

/**
 * Intelligent AI analysis & summarization engine for PDF/DOCX/Image/Text documents.
 * Produces structured, LLM-style multi-section Markdown summaries.
 * @param {Array} parsedAttachments 
 * @param {string} prompt 
 * @returns {string}
 */
export function getSmartOfflineDocumentResponse(parsedAttachments, prompt) {
  const lowerPrompt = (prompt || '').toLowerCase();
  
  const textFiles = parsedAttachments.filter(a => !a.isImage && a.text);
  const imageFiles = parsedAttachments.filter(a => a.isImage);

  if (textFiles.length === 0 && imageFiles.length > 0) {
    return `### 🖼️ Multi-Modal Image Analysis & Vision Comprehension

**Attached Image(s)**: ${imageFiles.map(i => `\`${i.name}\``).join(', ')}

### 📌 Overview & Vision Processing Status:
- **Detected Format**: ${imageFiles.map(i => i.mimeType).join(', ')}
- **Multi-Modal Visual AI**: To enable live vision analysis (OCR text extraction, diagram reading, object recognition, and visual QA), add your \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` to your \`.env\` file.`;
  }

  const combinedText = textFiles.map(f => f.text).join('\n\n');
  const fileNames = textFiles.map(f => f.name).join(', ');

  if (!combinedText || combinedText.trim().length === 0) {
    return `⚠️ **Document Extraction Warning**: Unable to extract readable text from attached file(s) (\`${fileNames}\`). The file may contain scanned image pages without OCR layer, password-protection, or empty content.`;
  }

  // Check if query is about skills / resume analysis
  if (lowerPrompt.includes('skill') || lowerPrompt.includes('missing') || lowerPrompt.includes('resume') || lowerPrompt.includes('cv')) {
    const commonTechSkills = [
      'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue', 'Angular',
      'Node.js', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'C++', 'C#', '.NET',
      'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GitHub',
      'System Design', 'Microservices', 'Unit Testing', 'Jest', 'Tailwind CSS', 'Redux'
    ];

    const foundSkills = [];
    const lowerDoc = combinedText.toLowerCase();

    commonTechSkills.forEach(skill => {
      if (lowerDoc.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    const recommendedMissing = [
      'Docker & Containerization',
      'AWS / Cloud Infrastructure',
      'CI/CD Pipelines',
      'System Design & Microservices Architecture',
      'Automated Testing (Jest / Playwright)',
      'GraphQL & Redis Caching'
    ].filter(skill => !foundSkills.some(fs => skill.toLowerCase().includes(fs.toLowerCase())));

    return `## 📄 Resume & Skills Analysis: \`${fileNames}\`

### 🛠️ Key Identified Skills:
${foundSkills.length > 0 ? foundSkills.map(s => `- **${s}**`).join('\n') : '- *General content detected; tech keywords limited.*'}

### 🚀 Recommended High-Demand Missing Skills:
${recommendedMissing.map(s => `- ⚡ **${s}**`).join('\n')}

### 💡 Optimization Recommendations:
1. **Quantify Achievements**: Add metrics (e.g. *"Optimized speed by 35%"* or *"Managed 10k+ requests/day"*).
2. **Action Verbs**: Start bullet points with strong verbs like *Architected, Engineered, Developed, Deployed*.
3. **Cloud Experience**: Highlight Docker, CI/CD, and Cloud deployment skills.`;
  }

  // Structured LLM Summarization Engine
  const lines = combinedText.split('\n').map(l => l.trim()).filter(Boolean);
  const wordCount = combinedText.split(/\s+/).length;

  // Detect Document Category
  let docCategory = 'Document';
  const lowerText = combinedText.toLowerCase();
  if (lowerText.includes('curriculum') || lowerText.includes('syllabus') || lowerText.includes('course') || lowerText.includes('week -')) {
    docCategory = 'Course Curriculum & Training Syllabus';
  } else if (lowerText.includes('assignment') || lowerText.includes('submission') || lowerText.includes('reg. no')) {
    docCategory = 'Academic Assignment & Practical Work';
  } else if (lowerText.includes('function') || lowerText.includes('import ') || lowerText.includes('const ') || lowerText.includes('def ')) {
    docCategory = 'Source Code & Technical Script';
  } else if (lowerText.includes('abstract') || lowerText.includes('introduction') || lowerText.includes('conclusion')) {
    docCategory = 'Research Report & Project Document';
  }

  // Extract headings and key topics
  const headings = [];
  const keyPoints = [];
  const techKeywords = new Set();

  const commonTech = [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue', 'Angular',
    'Node.js', 'Express', 'Python', 'Django', 'FastAPI', 'Pandas', 'Matplotlib', 'NumPy',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'CI/CD',
    'Data Visualization', 'Machine Learning', 'Artificial Intelligence', 'System Design'
  ];

  commonTech.forEach(tech => {
    if (new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(combinedText)) {
      techKeywords.add(tech);
    }
  });

  lines.forEach(line => {
    if (line.length > 5 && line.length < 90) {
      if (/^(\d+[.)]|#|Week|Module|Chapter|Section|SL\.NO|NAME-|CODE|>)/i.test(line) || /^[A-Z\s]{4,40}$/.test(line)) {
        headings.push(line.replace(/^[#>\s-]+/, ''));
      } else if (line.includes(':') || line.startsWith('-') || line.startsWith('•')) {
        keyPoints.push(line.replace(/^[-•\s]+/, ''));
      }
    }
  });

  const uniqueHeadings = Array.from(new Set(headings)).slice(0, 8);
  const uniqueKeyPoints = Array.from(new Set(keyPoints)).slice(0, 8);
  const detectedTech = Array.from(techKeywords);

  const overviewText = lines.slice(0, 6).join(' ').substring(0, 350) + '...';

  return `## 📄 Comprehensive Analysis & Summary: \`${fileNames}\`

### 📌 1. Executive Summary & Overview
- **Document Type**: **${docCategory}**
- **Document Volume**: ~**${wordCount} words** across **${lines.length} lines** of content.
- **Core Summary**: ${overviewText}

---

### 📚 2. Key Modules & Structural Content
${uniqueHeadings.length > 0 ? uniqueHeadings.map((h, i) => `**${i + 1}. ${h}**`).join('\n\n') : lines.slice(0, 5).map((l, i) => `**${i + 1}. ${l}**`).join('\n\n')}

---

${detectedTech.length > 0 ? `### 🛠️ 3. Technologies, Libraries & Tools Identified
${detectedTech.map(t => `- ⚡ **${t}**`).join('\n')}

---` : ''}

### 💡 4. Essential Highlights & Detailed Points
${uniqueKeyPoints.length > 0 ? uniqueKeyPoints.map(kp => `- 🔹 ${kp}`).join('\n') : lines.slice(6, 12).map(l => `- 🔹 ${l}`).join('\n')}

---

### 🎯 5. Actionable Insights & Summary Takeaways
1. **Structured Learning & Execution**: The document provides a structured progression covering core concepts, setup, and practical implementation.
2. **Practical Outcome**: Focuses on real-world application, data processing, and technical skill development.
3. **Live LLM Evaluation**: For real-time multi-page context streaming with OpenAI / Gemini / Copilot, configure your API key in \`.env\`.`;
}
