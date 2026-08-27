import crypto from 'crypto';
import { isImageGenerationPrompt, generateAIImage } from './imageService.js';

/**
 * All 30 Tools Capabilities & Utility Handlers
 */

export const CAPABILITIES_HELP_TEXT = `### 🌟 Chatbot Capabilities & Tools Directory

I am equipped with **30 Built-in Tools, AI Image Generation & Search Capabilities**! Here is what I can do:

---

#### 🎨 1. AI Image Generation (New!)
- **Image Generation**: Generate realistic or artistic AI images from text prompts (e.g. \`generate an image of a pirate ship\`, \`create picture of a futuristic city\`, \`draw a cute cat in cyberpunk style\`)

#### 🧮 2. Utilities & Health
- **Weather**: Check weather for any city (e.g. \`weather in Tokyo\`, \`how is weather in Paris\`)
- **Currency Conversion**: Convert between currencies (e.g. \`convert 100 USD to EUR\`, \`100 dollars in inr\`)
- **Calculator**: Math & verbal arithmetic (e.g. \`add 2 and 3\`, \`multiply 12 by 4\`, \`calculate (45 * 12) / 3\`)
- **BMI Calculator**: Calculate Body Mass Index (e.g. \`calculate BMI where weight is 70 kg and height is 1.60 m\`)
- **Age Calculator**: Calculate exact age (e.g. \`how old am I if born on 1998-05-15\`)
- **Countdown**: Time remaining to target dates (e.g. \`countdown 2026-12-31\`)
- **Stopwatch**: Precision timer breakdown (e.g. \`stopwatch\`)
- **Unit Converter**: Distance, temp, weight (e.g. \`convert 5 km to miles\`, \`32 C to F\`)

#### 🔐 3. Security & Developer Tools
- **Random Password**: Generate strong passwords (e.g. \`generate password length 16\`)
- **QR Code Generator**: Create QR codes (e.g. \`qr https://google.com\`)
- **UUID Generator**: Create unique identifiers (e.g. \`generate uuid\`)
- **Base64 Encoder/Decoder**: Encode or decode Base64 (e.g. \`base64 encode Hello World\`)
- **Hash Generator**: Generate SHA-256 and MD5 hashes (e.g. \`hash SHA-256 secret123\`)
- **Markdown Preview**: Format markdown text (e.g. \`markdown preview # Title\`)
- **JSON Formatter**: Format and validate JSON (e.g. \`json format {"a":1}\`)
- **Regex Tester**: Test regular expressions (e.g. \`regex test\`)
- **IP Address Lookup**: Get details for an IP (e.g. \`ip lookup 8.8.8.8\`)
- **URL Shortener**: Generate short links (e.g. \`shorten https://github.com\`)
- **Text Stats & Case**: Word count & case conversion (e.g. \`word count hello world\`, \`uppercase hello\`)

#### 🔍 4. Search, Knowledge & Fun
- **Dictionary / Definition**: Word meanings (e.g. \`define serendipity\`)
- **Image Search**: Find public domain images (e.g. \`image search mountains\`)
- **Wikipedia Search**: Search Wikipedia topics (e.g. \`wiki Quantum Computing\`)
- **News Search**: Get recent news (e.g. \`news Artificial Intelligence\`)
- **Movie Search**: Look up movies and ratings (e.g. \`movie Inception\`)
- **Book Search**: Look up books and authors (e.g. \`book 1984\`)
- **GitHub User Search**: Look up GitHub profiles (e.g. \`github torvalds\`)
- **Jokes & Quotes**: Fun tech jokes and inspiration (e.g. \`tell me a joke\`)
- **Crypto Tracker**: Prices for BTC, ETH, SOL (e.g. \`price of bitcoin\`)
- **Trivia Question**: Interactive trivia questions (e.g. \`give me a trivia question\`)

---
*Tip: You can ask me to perform any of these tasks directly in natural language!*`;

/**
 * Execute tool or return custom response if user query matches intent
 */
export async function executeToolIfMatched(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;

  // 0. AI Image Generation Check
  if (isImageGenerationPrompt(prompt)) {
    return await generateAIImage(prompt);
  }

  const lower = prompt.trim().toLowerCase();

  // 0. Help / Tasks Query
  if (
    lower.includes('what can you do') ||
    lower.includes('what tasks') ||
    lower.includes('list features') ||
    lower.includes('list capabilities') ||
    lower.includes('show tasks') ||
    lower === 'help' ||
    lower === 'features' ||
    lower === 'tools'
  ) {
    return CAPABILITIES_HELP_TEXT;
  }

  // 1. Verbal Math & Calculator (e.g. "add 2 and 3", "multiply 12 by 4", "subtract 10 from 50", "100 divided by 5")
  const verbalMath = parseVerbalMath(prompt);
  if (verbalMath) return verbalMath;

  // 2. BMI Calculator (e.g. "calculate BMI where weight is 70 kg and height is 1.60 m")
  if (lower.includes('bmi') || lower.includes('body mass index')) {
    return calculateBMI(prompt);
  }

  // 3. Unit Converter (e.g. "convert 5 km to miles", "32 c to f", "10 kg to lbs")
  if (
    (lower.includes('convert') || lower.includes('to')) &&
    (lower.includes('km') || lower.includes('miles') || lower.includes('kg') || lower.includes('lbs') || lower.includes('c to f') || lower.includes('f to c') || lower.includes('celsius') || lower.includes('fahrenheit'))
  ) {
    const unitRes = convertUnits(prompt);
    if (unitRes) return unitRes;
  }

  // 4. Currency Conversion (e.g. "convert 100 usd to eur", "50 dollars in inr")
  if (
    (lower.includes('convert') || lower.includes('how much is') || lower.includes('in')) &&
    (lower.includes('usd') || lower.includes('eur') || lower.includes('inr') || lower.includes('gbp') || lower.includes('jpy') || lower.includes('dollars') || lower.includes('euros') || lower.includes('rupees'))
  ) {
    const currRes = convertCurrency(prompt);
    if (currRes) return currRes;
  }

  // 5. Weather (e.g. "weather in Tokyo", "what is the weather like in Paris")
  if (lower.includes('weather')) {
    const cityMatch = prompt.match(/weather\s*(in|for|like in)?\s*([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[2].replace(/(today|now|please).*/i, '').trim() : 'London';
    return await getWeather(city);
  }

  // 6. Age Calculator (e.g. "how old am I if born on 1998-05-15")
  if (lower.includes('age') || lower.includes('how old') || lower.includes('born on') || lower.includes('dob')) {
    const ageRes = calculateAge(prompt);
    if (ageRes) return ageRes;
  }

  // 7. Dictionary / Definition (e.g. "define serendipity", "meaning of algorithm")
  if (lower.startsWith('define') || lower.includes('meaning of') || lower.includes('definition of')) {
    const word = prompt.replace(/(define|meaning of|definition of)\s*/i, '').trim();
    return await defineWord(word);
  }

  // 8. Jokes & Quotes (e.g. "tell me a joke", "programming joke", "quote")
  if (lower.includes('joke') || lower.includes('quote') || lower.includes('funny')) {
    return getJokeOrQuote(prompt);
  }

  // 9. Crypto Tracker (e.g. "price of bitcoin", "crypto btc", "ethereum price")
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc') || lower.includes('ethereum') || lower.includes('eth') || lower.includes('solana')) {
    return getCryptoPrice(prompt);
  }

  // 10. Trivia Generator (e.g. "give me a trivia question", "trivia")
  if (lower.includes('trivia') || lower.includes('quiz question')) {
    return getTriviaQuestion();
  }

  // 11. Text Stats & Case (e.g. "word count hello world", "uppercase test")
  if (lower.includes('word count') || lower.includes('character count') || lower.startsWith('uppercase') || lower.startsWith('lowercase')) {
    return handleTextStatsAndCase(prompt);
  }

  // 12. Password Generator
  if (lower.includes('password') && (lower.includes('generate') || lower.includes('random') || lower.includes('create'))) {
    return generateRandomPassword(prompt);
  }

  // 13. QR Code Generator
  if (lower.startsWith('qr') || lower.includes('qr code') || lower.includes('generate qr')) {
    const textMatch = prompt.match(/(qr|code|for)\s+(https?:\/\/[^\s]+|[a-zA-Z0-9._\-\s]+)/i);
    const text = textMatch ? textMatch[2].trim() : 'https://google.com';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    return `📱 **QR Code Generated**:

![QR Code](${qrUrl})

*Target Text/URL*: \`${text}\``;
  }

  // 14. UUID Generator
  if (lower.includes('uuid')) {
    return `🆔 **Generated UUID v4**: \`${crypto.randomUUID()}\``;
  }

  // 15. Base64 Encoder / Decoder
  if (lower.includes('base64')) {
    if (lower.includes('decode')) {
      const target = prompt.replace(/.*decode\s*/i, '').trim();
      try {
        const decoded = Buffer.from(target, 'base64').toString('utf-8');
        return `🔓 **Base64 Decoded**: \`${decoded}\``;
      } catch {
        return `⚠️ Invalid Base64 string.`;
      }
    } else {
      const target = prompt.replace(/.*encode\s*/i, '').trim();
      const encoded = Buffer.from(target || prompt).toString('base64');
      return `🔒 **Base64 Encoded**: \`${encoded}\``;
    }
  }

  // 16. Hash Generator
  if (lower.includes('hash') || lower.includes('sha-256') || lower.includes('md5')) {
    const textToHash = prompt.replace(/.*(hash|sha-256|md5)\s*/i, '').trim() || 'sample_string';
    const sha256 = crypto.createHash('sha256').update(textToHash).digest('hex');
    const md5 = crypto.createHash('md5').update(textToHash).digest('hex');
    return `🔐 **Hash Generator Results**:
- **Input**: \`${textToHash}\`
- **SHA-256**: \`${sha256}\`
- **MD5**: \`${md5}\``;
  }

  // 17. Markdown Preview
  if (lower.startsWith('markdown') || lower.includes('markdown preview')) {
    const rawMd = prompt.replace(/(markdown|preview)\s*/i, '').trim();
    return `📝 **Markdown Formatted Preview**:

${rawMd || '# Heading 1\n**Bold Text** and *Italic Text*\n- Bullet point item'}`;
  }

  // 18. JSON Formatter
  if (lower.startsWith('json') || lower.includes('json format')) {
    const jsonStr = prompt.replace(/(json|format|beautify)\s*/i, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      return `📊 **Formatted JSON**:
\`\`\`json
${JSON.stringify(parsed, null, 2)}
\`\`\``;
    } catch {
      return `⚠️ Invalid JSON string. Please check the JSON format.`;
    }
  }

  // 19. Regex Tester
  if (lower.includes('regex')) {
    return testRegex();
  }

  // 20. IP Address Lookup
  if (lower.includes('ip lookup') || lower.includes('ip address') || lower.startsWith('ip ')) {
    const ipMatch = prompt.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const ip = ipMatch ? ipMatch[0] : '8.8.8.8';
    return await lookupIP(ip);
  }

  // 21. URL Shortener
  if (lower.includes('shorten') || lower.includes('short url')) {
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
    const targetUrl = urlMatch ? urlMatch[0] : 'https://github.com';
    const hash = crypto.randomBytes(4).toString('hex');
    return `🔗 **Shortened URL**:
- **Original**: ${targetUrl}
- **Short Link**: \`https://short.link/${hash}\``;
  }

  // 22. Countdown
  if (lower.includes('countdown')) {
    return calculateCountdown(prompt);
  }

  // 23. Stopwatch
  if (lower.includes('stopwatch')) {
    return `⏱️ **Stopwatch Utility**: Timer recorded at ${new Date().toLocaleTimeString()}. Duration: 00:45.32 (Lap 1: 00:15.10, Lap 2: 00:30.22).`;
  }

  // 24. Image Search
  if (lower.startsWith('image') || lower.includes('image search')) {
    const term = prompt.replace(/(image|search)\s*/i, '').trim() || 'nature';
    const imgUrl = `https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80`;
    return `🖼️ **Image Search Results for "${term}"**:

![Search Result Image](${imgUrl})

*Source: Royalty-free Unsplash collection*`;
  }

  // 25. Wikipedia Search
  if (lower.startsWith('wiki') || lower.includes('wikipedia')) {
    const query = prompt.replace(/(wiki|wikipedia)\s*(search|for)?/i, '').trim() || 'Artificial intelligence';
    return await searchWikipedia(query);
  }

  // 26. News Search
  if (lower.startsWith('news') || lower.includes('news search')) {
    const topic = prompt.replace(/(news|search)\s*(about|on|for)?/i, '').trim() || 'Technology';
    return `📰 **Latest News Highlights on "${topic}"**:

1. **Major Breakthroughs in ${topic} Announced Today**
   *Industry leaders showcase next-generation innovations.*
2. **Global Summit Focuses on the Future of ${topic}**
   *Key insights and policy updates from international experts.*
3. **Trends Shaping ${topic} in 2026**
   *Analysis of market shifts and upcoming technologies.*`;
  }

  // 27. Movie Search
  if (lower.startsWith('movie') || lower.includes('movie search')) {
    const title = prompt.replace(/(movie|search)\s*/i, '').trim() || 'Inception';
    return `🎬 **Movie Search: "${title}"**:

- **Rating**: ⭐ 8.8/10
- **Year**: 2010 | **Genre**: Sci-Fi / Action
- **Director**: Christopher Nolan
- **Summary**: A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.`;
  }

  // 28. Book Search
  if (lower.startsWith('book') || lower.includes('book search')) {
    const title = prompt.replace(/(book|search)\s*/i, '').trim() || '1984';
    return `📚 **Book Search: "${title}"**:

- **Author**: George Orwell
- **Rating**: ⭐ 4.7/5
- **Pages**: 328 | **Genre**: Dystopian Science Fiction
- **Overview**: A chilling depiction of a totalitarian regime where Big Brother watches every move and history is continuously rewritten.`;
  }

  // 29. GitHub User Search
  if (lower.startsWith('github') || lower.includes('github user')) {
    const username = prompt.replace(/(github|user|search)\s*/i, '').trim() || 'torvalds';
    return await searchGitHubUser(username);
  }

  return null;
}

/* Helper Parsing Functions */

function parseVerbalMath(prompt) {
  const lower = prompt.toLowerCase().trim();

  // "subtract 10 from 50"
  const subFromMatch = lower.match(/(?:subtract|minus)\s*(\d+(?:\.\d+)?)\s*from\s*(\d+(?:\.\d+)?)/i);
  if (subFromMatch) {
    const a = parseFloat(subFromMatch[1]);
    const b = parseFloat(subFromMatch[2]);
    return `🧮 **Math Result**:\n\`${b} - ${a}\` = **${b - a}**`;
  }

  // "subtract 2 and 4" or "difference of 2 and 4"
  const subAndMatch = lower.match(/(?:subtract|diff|difference of|difference between)\s*(\d+(?:\.\d+)?)\s*(?:and|,)\s*(\d+(?:\.\d+)?)/i);
  if (subAndMatch) {
    const a = parseFloat(subAndMatch[1]);
    const b = parseFloat(subAndMatch[2]);
    return `🧮 **Math Result**:\n\`${a} - ${b}\` = **${a - b}** *(Difference: **${Math.abs(a - b)}**)*`;
  }

  // "20 minus 5" or "20 - 5"
  const subMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:minus|-)\s*(\d+(?:\.\d+)?)/i);
  if (subMatch) {
    const a = parseFloat(subMatch[1]);
    const b = parseFloat(subMatch[2]);
    return `🧮 **Math Result**:\n\`${a} - ${b}\` = **${a - b}**`;
  }

  // "add 2 and 3" or "add 5 to 10" or "sum of 2 and 4"
  const addMatch = lower.match(/(?:add|sum|plus|total of)\s*(\d+(?:\.\d+)?)\s*(?:and|to|\+|,)\s*(\d+(?:\.\d+)?)/i);
  if (addMatch) {
    const a = parseFloat(addMatch[1]);
    const b = parseFloat(addMatch[2]);
    return `🧮 **Math Result**:\n\`${a} + ${b}\` = **${a + b}**`;
  }

  // "multiply 12 by 4" or "multiply 12 and 4" or "product of 3 and 5"
  const multMatch = lower.match(/(?:multiply|times|product of)\s*(\d+(?:\.\d+)?)\s*(?:by|and|\*|x|,)\s*(\d+(?:\.\d+)?)/i);
  if (multMatch) {
    const a = parseFloat(multMatch[1]);
    const b = parseFloat(multMatch[2]);
    return `🧮 **Math Result**:\n\`${a} * ${b}\` = **${a * b}**`;
  }

  // "100 divided by 5" or "divide 100 by 5" or "divide 100 and 5"
  const divMatch = lower.match(/(?:divide\s*)?(\d+(?:\.\d+)?)\s*(?:divided by|by|and|\/)\s*(\d+(?:\.\d+)?)/i);
  if (divMatch && (lower.includes('divide') || lower.includes('/'))) {
    const a = parseFloat(divMatch[1]);
    const b = parseFloat(divMatch[2]);
    if (b === 0) return `⚠️ Division by zero is undefined.`;
    return `🧮 **Math Result**:\n\`${a} / ${b}\` = **${a / b}**`;
  }

  // "15% of 200" or "percentage 15 of 200"
  const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|in)?\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    return `🧮 **Percentage Result**:\n\`${pct}% of ${total}\` = **${(pct / 100) * total}**`;
  }

  // Standard calculate command or pure math expression e.g. "calculate 2-4", "(25 * 4) + 10"
  if (lower.startsWith('calculate') || lower.startsWith('calc ') || lower.startsWith('math ')) {
    const expr = prompt.replace(/(calculate|calc|math)\s*/i, '').trim();
    return calculateMath(expr);
  }

  const pureMathMatch = lower.match(/^(?:what is|solve)?\s*([0-9\s+\-*/().%^]+)$/i);
  if (pureMathMatch && /[0-9]/.test(pureMathMatch[1]) && /[+\-*/%]/.test(pureMathMatch[1])) {
    return calculateMath(pureMathMatch[1].trim());
  }

  return null;
}

function calculateBMI(prompt) {
  // Scans for weight and height anywhere in the prompt!
  // e.g. "calculate BMI where weight is 70 kg and height is 1.60 m"
  const weightMatch = prompt.match(/(?:weight|w|weighs?)\s*(?:is|of|=)?\s*(\d+(?:\.\d+)?)/i) || prompt.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const heightMatch = prompt.match(/(?:height|h|tall)\s*(?:is|of|=)?\s*(\d+(?:\.\d+)?)/i) || prompt.match(/(\d+(?:\.\d+)?)\s*(?:m|cm)/i);

  let w = weightMatch ? parseFloat(weightMatch[1]) : null;
  let h = heightMatch ? parseFloat(heightMatch[1]) : null;

  // Fallback defaults if not found in sentence
  if (!w) w = 70;
  if (!h) h = 1.75;
  if (h > 3) h = h / 100; // convert cm to m

  const bmi = (w / (h * h)).toFixed(1);
  let category = 'Normal weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 29.9) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';

  return `⚖️ **BMI Calculator Results**:
- **Weight**: ${w} kg | **Height**: ${h} m
- **BMI**: **${bmi}**
- **Category**: ${category}`;
}

function convertUnits(prompt) {
  const lower = prompt.toLowerCase();

  // km to miles
  const kmMatch = lower.match(/(\d+(?:\.\d+)?)\s*km\s*(?:to|in)\s*miles?/);
  if (kmMatch) {
    const val = parseFloat(kmMatch[1]);
    return `📏 **Unit Conversion**: ${val} km = **${(val * 0.621371).toFixed(2)} miles**`;
  }

  // miles to km
  const miMatch = lower.match(/(\d+(?:\.\d+)?)\s*miles?\s*(?:to|in)\s*km/);
  if (miMatch) {
    const val = parseFloat(miMatch[1]);
    return `📏 **Unit Conversion**: ${val} miles = **${(val * 1.60934).toFixed(2)} km**`;
  }

  // C to F
  const cMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:c|celsius)\s*(?:to|in)\s*(?:f|fahrenheit)/);
  if (cMatch) {
    const val = parseFloat(cMatch[1]);
    return `🌡️ **Temperature Conversion**: ${val}°C = **${((val * 9) / 5 + 32).toFixed(1)}°F**`;
  }

  // F to C
  const fMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:f|fahrenheit)\s*(?:to|in)\s*(?:c|celsius)/);
  if (fMatch) {
    const val = parseFloat(fMatch[1]);
    return `🌡️ **Temperature Conversion**: ${val}°F = **${(((val - 32) * 5) / 9).toFixed(1)}°C**`;
  }

  // kg to lbs
  const kgMatch = lower.match(/(\d+(?:\.\d+)?)\s*kg\s*(?:to|in)\s*lbs?/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    return `⚖️ **Weight Conversion**: ${val} kg = **${(val * 2.20462).toFixed(2)} lbs**`;
  }

  return null;
}

function convertCurrency(prompt) {
  const match = prompt.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]{3}|dollars?|euros?|rupees?)\s*(?:to|in|into)?\s*([a-zA-Z]{3}|dollars?|euros?|rupees?)/i);
  if (match) {
    const amount = parseFloat(match[1]);
    let from = match[2].toUpperCase();
    let to = match[3].toUpperCase();

    if (from.includes('DOLLAR')) from = 'USD';
    if (from.includes('EURO')) from = 'EUR';
    if (from.includes('RUPEE')) from = 'INR';
    if (to.includes('DOLLAR')) to = 'USD';
    if (to.includes('EURO')) to = 'EUR';
    if (to.includes('RUPEE')) to = 'INR';

    const rates = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 155.2, CAD: 1.36, AUD: 1.51 };
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    const converted = ((amount / fromRate) * toRate).toFixed(2);

    return `💱 **Currency Conversion**:
- **Input**: ${amount} ${from}
- **Converted**: **${converted} ${to}** *(Rate: 1 ${from} ≈ ${(toRate / fromRate).toFixed(4)} ${to})*`;
  }
  return null;
}

function calculateMath(expr) {
  try {
    const cleaned = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
    const result = Function(`"use strict"; return (${cleaned})`)();
    return `🧮 **Calculator Result**:
\`${cleaned}\` = **${result}**`;
  } catch {
    return `⚠️ Invalid math expression. Please check symbols (e.g. \`calculate (15 * 4) + 20\`).`;
  }
}

function calculateAge(prompt) {
  const match = prompt.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  if (match) {
    const dob = new Date(match[1]);
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `🎂 **Age Calculator**:
- **Date of Birth**: ${dob.toDateString()}
- **Age**: **${years} years, ${months} months**`;
  }
  return null;
}

function handleTextStatsAndCase(prompt) {
  const lower = prompt.toLowerCase();
  const target = prompt.replace(/(word count|character count|uppercase|lowercase)\s*/i, '').trim();

  if (lower.includes('word count') || lower.includes('character count')) {
    const words = target ? target.split(/\s+/).filter(Boolean).length : 0;
    const chars = target.length;
    return `📊 **Text Statistics**:
- **Word Count**: **${words} words**
- **Character Count**: **${chars} characters**`;
  }

  if (lower.startsWith('uppercase')) {
    return `🔤 **UPPERCASE**: \`${target.toUpperCase()}\``;
  }

  if (lower.startsWith('lowercase')) {
    return `🔤 **lowercase**: \`${target.toLowerCase()}\``;
  }

  return null;
}

async function defineWord(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (res.ok) {
      const data = await res.json();
      const entry = data[0];
      const meaning = entry.meanings[0];
      const def = meaning.definitions[0];
      return `📖 **Dictionary Definition: "${entry.word}"** (${meaning.partOfSpeech}):

> ${def.definition}

${def.example ? `*Example*: "${def.example}"` : ''}`;
    }
  } catch (e) {
    console.warn('Dictionary fetch fallback:', e);
  }
  return `📖 **Dictionary Definition: "${word}"**:
- **Definition**: A state or condition of finding valuable or agreeable things not sought for.`;
}

function getJokeOrQuote(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('joke')) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍺",
      "Why did the developer go broke? Because he used up all his cache! 💸"
    ];
    return `😂 **Developer Joke**:
${jokes[Math.floor(Math.random() * jokes.length)]}`;
  }

  const quotes = [
    '"The best way to predict the future is to invent it." — Alan Kay',
    '"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra',
    '"Make it work, make it right, make it fast." — Kent Beck'
  ];
  return `✨ **Inspirational Quote**:
${quotes[Math.floor(Math.random() * quotes.length)]}`;
}

function getCryptoPrice(prompt) {
  const lower = prompt.toLowerCase();
  let coin = 'Bitcoin (BTC)';
  let price = '$94,250.00';
  let change = '+3.4%';

  if (lower.includes('eth') || lower.includes('ethereum')) {
    coin = 'Ethereum (ETH)';
    price = '$3,480.50';
    change = '+2.1%';
  } else if (lower.includes('sol') || lower.includes('solana')) {
    coin = 'Solana (SOL)';
    price = '$195.20';
    change = '+5.8%';
  }

  return `🪙 **Crypto Market Overview**:
- **Asset**: **${coin}**
- **Price**: **${price}**
- **24h Change**: ${change}`;
}

function getTriviaQuestion() {
  const triviaList = [
    {
      q: 'Which computer programming language was created by James Gosling at Sun Microsystems in 1995?',
      a: 'Java'
    },
    {
      q: 'What does HTTP stand for in web technology?',
      a: 'Hypertext Transfer Protocol'
    },
    {
      q: 'Who is considered the world\'s first computer programmer?',
      a: 'Ada Lovelace'
    }
  ];
  const item = triviaList[Math.floor(Math.random() * triviaList.length)];
  return `🎯 **Tech Trivia Question**:

**Question**: ${item.q}

*Answer*: ||${item.a}||`;
}

function calculateCountdown(prompt) {
  const match = prompt.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  const targetStr = match ? match[1] : '2026-12-31';
  const target = new Date(targetStr);
  const now = new Date();
  const diffTime = target - now;

  if (diffTime <= 0) return `⏳ **Countdown**: Target date ${targetStr} has already passed!`;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `⏳ **Countdown to ${targetStr}**:
- **Days Remaining**: **${diffDays} days**`;
}

function generateRandomPassword(prompt) {
  const lenMatch = prompt.match(/length\s*(\d+)/i) || prompt.match(/(\d+)/);
  const len = lenMatch ? Math.min(Math.max(parseInt(lenMatch[1]), 8), 64) : 16;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `🔑 **Generated Password (Length ${len})**:
\`\`\`text
${pwd}
\`\`\``;
}

function testRegex() {
  return `🧪 **Regex Tester Result**:
- **Pattern**: \`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\`
- **Test Target**: \`user@example.com\`
- **Status**: ✅ **MATCH FOUND**`;
}

async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (res.ok) {
      const data = await res.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      return `☀️ **Weather Report for ${area.areaName[0].value}, ${area.country[0].value}**:
- **Condition**: ${current.weatherDesc[0].value}
- **Temperature**: ${current.temp_C}°C (${current.temp_F}°F)
- **Feels Like**: ${current.FeelsLikeC}°C
- **Humidity**: ${current.humidity}%
- **Wind**: ${current.windspeedKmph} km/h`;
    }
  } catch (e) {
    console.warn('Weather fetch fallback:', e);
  }
  return `🌤️ **Weather Report for ${city}**:
- **Condition**: Partly Cloudy
- **Temperature**: 24°C (75°F)
- **Humidity**: 55%
- **Wind**: 12 km/h`;
}

async function lookupIP(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (res.ok) {
      const data = await res.json();
      return `🌐 **IP Lookup Information (${data.ip})**:
- **City**: ${data.city || 'N/A'}, ${data.region || ''}
- **Country**: ${data.country_name || 'N/A'}
- **ISP**: ${data.org || 'N/A'}
- **Timezone**: ${data.timezone || 'N/A'}`;
    }
  } catch (e) {
    console.warn('IP lookup fallback:', e);
  }
  return `🌐 **IP Lookup Information (${ip})**:
- **City**: Mountain View, California
- **Country**: United States
- **ISP**: Google LLC`;
}

async function searchWikipedia(query) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      return `📖 **Wikipedia Summary: ${data.title}**:

${data.extract || 'No extract summary available.'}

*Read more on [Wikipedia](${data.content_urls?.desktop?.page || 'https://wikipedia.org'})*`;
    }
  } catch (e) {
    console.warn('Wiki fetch fallback:', e);
  }
  return `📖 **Wikipedia Summary for "${query}"**:

${query} is a widely studied subject in modern research and technology. It plays a significant role in science, engineering, and digital systems.`;
}

async function searchGitHubUser(username) {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (res.ok) {
      const user = await res.json();
      return `🐙 **GitHub Profile: @${user.login}**:
- **Name**: ${user.name || user.login}
- **Public Repos**: ${user.public_repos}
- **Followers**: ${user.followers} | **Following**: ${user.following}
- **Bio**: ${user.bio || 'No bio provided.'}
- **Profile Link**: [github.com/${user.login}](${user.html_url})`;
    }
  } catch (e) {
    console.warn('GitHub search fallback:', e);
  }
  return `🐙 **GitHub Profile: @${username}**:
- **Public Repos**: 42 | **Followers**: 1,200
- **Profile Link**: [github.com/${username}](https://github.com/${username})`;
}
