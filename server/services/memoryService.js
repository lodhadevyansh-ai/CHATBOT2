import Memory from '../models/Memory.js';
import { isMongoConnected } from '../db/mongo.js';
import { db } from '../db.js';

/**
 * Fetch all memories stored for a user (from MongoDB primary or local fallback)
 */
export async function getUserMemories(userId) {
  if (!userId) return [];

  if (isMongoConnected()) {
    try {
      const docs = await Memory.find({ userId }).sort({ updatedAt: -1 }).lean();
      return docs.map(d => ({
        id: d._id.toString(),
        userId: d.userId,
        key: d.key,
        value: d.value,
        category: d.category || 'fact',
        rawText: d.rawText || '',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        source: 'MongoDB'
      }));
    } catch (err) {
      console.warn('MongoDB read failed, using local DB fallback:', err.message);
    }
  }

  // Fallback to local DB
  const localMemories = db.getMemoriesByUser(userId);
  return localMemories.map(m => ({
    id: m.id || m._id,
    userId: m.userId,
    key: m.key,
    value: m.value,
    category: m.category || 'fact',
    rawText: m.rawText || '',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    source: 'Local DB Fallback'
  }));
}

/**
 * Save or update a memory item in MongoDB & local DB fallback
 */
export async function saveMemory(userId, key, value, rawText = '', category = 'fact') {
  if (!userId || !key || !value) return null;

  const cleanKey = String(key).trim().toLowerCase();
  const cleanValue = String(value).trim();
  let savedDoc = null;

  if (isMongoConnected()) {
    try {
      savedDoc = await Memory.findOneAndUpdate(
        { userId, key: cleanKey },
        {
          key: cleanKey,
          value: cleanValue,
          rawText: rawText || `User memory: ${cleanKey} = ${cleanValue}`,
          category: category || 'fact'
        },
        { upsert: true, new: true, runValidators: true }
      ).lean();
    } catch (err) {
      console.warn('Failed to upsert memory in MongoDB:', err.message);
    }
  }

  // Always keep local DB fallback in sync
  const fallbackDoc = db.upsertMemory(userId, cleanKey, cleanValue, rawText, category);

  return savedDoc ? {
    id: savedDoc._id.toString(),
    userId: savedDoc.userId,
    key: savedDoc.key,
    value: savedDoc.value,
    category: savedDoc.category,
    rawText: savedDoc.rawText,
    source: 'MongoDB'
  } : fallbackDoc;
}

/**
 * Delete a specific memory item by ID or key
 */
export async function deleteMemory(userId, memoryId) {
  if (!userId || !memoryId) return false;

  let mongoDeleted = false;
  if (isMongoConnected()) {
    try {
      const res = await Memory.deleteOne({
        userId,
        $or: [{ _id: memoryId }, { key: memoryId }]
      });
      mongoDeleted = res.deletedCount > 0;
    } catch (err) {
      console.warn('MongoDB delete failed:', err.message);
    }
  }

  const localDeleted = db.deleteMemoryById(userId, memoryId);
  return mongoDeleted || localDeleted;
}

/**
 * Clear all memories for a user
 */
export async function clearUserMemories(userId) {
  if (!userId) return false;

  if (isMongoConnected()) {
    try {
      await Memory.deleteMany({ userId });
    } catch (err) {
      console.warn('MongoDB clear memories failed:', err.message);
    }
  }

  db.clearMemoriesByUser(userId);
  return true;
}

/**
 * General-Case NLP & Heuristic Memory Extractor
 * Automatically extracts facts, identity, preferences, locations, custom notes from prompt
 */
export async function extractMemoriesFromPrompt(prompt, userId) {
  if (!prompt || typeof prompt !== 'string' || !userId) return [];

  const text = prompt.trim();
  const detected = [];

  // 1. Name / Identity patterns: "My name is X", "I am X", "Call me X", "Name's X"
  const namePatterns = [
    /my name is\s+([A-Za-z0-9_\s'-]+?)(?=\s+and|\s+from|\s+living|\s+is|\s+a|\s+an|[.,!;\n]|$)/i,
    /call me\s+([A-Za-z0-9_\s'-]+?)(?=\s+and|\s+from|\s+living|\s+is|\s+a|\s+an|[.,!;\n]|$)/i,
    /i'm\s+([A-Za-z0-9_\s'-]+?)(?=\s+and|\s+from|\s+living|\s+a|\s+an|[.,!;\n]|$)/i,
    /i am\s+([A-Za-z0-9_\s'-]+?)(?=\s+and|\s+from|\s+living|\s+a|\s+an|[.,!;\n]|$)/i
  ];

  // Avoid matching common phrases like "i am fine", "i am happy", "i am testing"
  const stopNames = ['fine', 'good', 'happy', 'sad', 'ok', 'okay', 'ready', 'here', 'going', 'using', 'trying', 'building', 'testing', 'a', 'an', 'the'];

  for (const regex of namePatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val.length >= 2 && val.length <= 40 && !stopNames.includes(val.toLowerCase())) {
        detected.push({ key: 'name', value: val, category: 'identity' });
        break;
      }
    }
  }

  // 2. Location patterns: "I live in X", "I am based in X", "I'm located in X", "I reside in X"
  const locPatterns = [
    /i live in\s+([A-Za-z0-9_\s,'-]+?)(?=[.,!;\n]|$)/i,
    /i am based in\s+([A-Za-z0-9_\s,'-]+?)(?=[.,!;\n]|$)/i,
    /i'm located in\s+([A-Za-z0-9_\s,'-]+?)(?=[.,!;\n]|$)/i,
    /my location is\s+([A-Za-z0-9_\s,'-]+?)(?=[.,!;\n]|$)/i,
    /i am from\s+([A-Za-z0-9_\s,'-]+?)(?=[.,!;\n]|$)/i
  ];

  for (const regex of locPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val.length >= 2 && val.length <= 50) {
        detected.push({ key: 'location', value: val, category: 'location' });
        break;
      }
    }
  }

  // 3. Favorites / Preferences: "My favorite X is Y"
  const favRegex = /my favorite\s+([A-Za-z0-9_\s-]+?)\s+is\s+([A-Za-z0-9_\s'-]+?)(?=[.,!;\n]|$)/gi;
  let favMatch;
  while ((favMatch = favRegex.exec(text)) !== null) {
    if (favMatch[1] && favMatch[2]) {
      const targetThing = favMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const val = favMatch[2].trim();
      if (targetThing && val) {
        detected.push({ key: `favorite_${targetThing}`, value: val, category: 'preference' });
      }
    }
  }

  // 4. Profession / Occupation: "I work as a X", "My job is X", "I am a software engineer"
  const jobPatterns = [
    /i work as a[n]?\s+([A-Za-z0-9_\s-]+?)(?=[.,!;\n]|$)/i,
    /my job is\s+([A-Za-z0-9_\s-]+?)(?=[.,!;\n]|$)/i,
    /my profession is\s+([A-Za-z0-9_\s-]+?)(?=[.,!;\n]|$)/i
  ];

  for (const regex of jobPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val.length >= 2 && val.length <= 50) {
        detected.push({ key: 'occupation', value: val, category: 'identity' });
        break;
      }
    }
  }

  // 5. Explicit remember command: "Remember that X", "Remember: X", "Please remember X"
  const remPatterns = [
    /remember that\s+(.+?)(?=[.,!;\n]|$)/i,
    /remember:\s*(.+?)(?=[.,!;\n]|$)/i,
    /please remember\s+(.+?)(?=[.,!;\n]|$)/i,
    /remember\s+my\s+([A-Za-z0-9_\s]+?)\s+is\s+(.+?)(?=[.,!;\n]|$)/i
  ];

  for (const regex of remPatterns) {
    const match = text.match(regex);
    if (match) {
      if (match.length >= 3 && match[1] && match[2]) {
        const k = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        const v = match[2].trim();
        detected.push({ key: k, value: v, category: 'custom' });
      } else if (match[1]) {
        const raw = match[1].trim();
        // Extract key from sentence or use general topic
        const keyName = raw.length > 25 ? `note_${Date.now().toString().slice(-4)}` : raw.split(/\s+/).slice(0, 3).join('_').toLowerCase();
        detected.push({ key: keyName, value: raw, category: 'custom' });
      }
    }
  }

  // 6. Generic "My <property> is <value>" patterns (e.g. "My birthday is June 5", "My dog is Max")
  const genericPropertyRegex = /my\s+([A-Za-z0-9_\s]+?)\s+is\s+([A-Za-z0-9_\s'-]+?)(?=[.,!;\n]|$)/gi;
  let propMatch;
  while ((propMatch = genericPropertyRegex.exec(text)) !== null) {
    if (propMatch[1] && propMatch[2]) {
      const rawProp = propMatch[1].trim().toLowerCase();
      const val = propMatch[2].trim();
      
      // Ignore if it's already captured or if prop is non-descriptive
      if (!['favorite', 'name', 'location', 'job'].some(sub => rawProp.includes(sub))) {
        if (rawProp.length <= 30 && val.length <= 60 && !stopNames.includes(val.toLowerCase())) {
          const cleanPropKey = rawProp.replace(/\s+/g, '_');
          detected.push({ key: cleanPropKey, value: val, category: 'fact' });
        }
      }
    }
  }

  // Deduplicate and save all detected memories to MongoDB & local DB
  const savedMemories = [];
  const seenKeys = new Set();

  for (const item of detected) {
    if (!seenKeys.has(item.key)) {
      seenKeys.add(item.key);
      const saved = await saveMemory(userId, item.key, item.value, text, item.category);
      if (saved) {
        savedMemories.push(saved);
      }
    }
  }

  return savedMemories;
}

/**
 * Format active memories into context block for LLM prompts
 */
export function formatMemoriesForContext(memories = []) {
  if (!Array.isArray(memories) || memories.length === 0) {
    return '';
  }

  const lines = memories.map(m => `- ${m.key}: ${m.value} (${m.category || 'fact'})`);
  return `--- STORED USER MEMORIES (MONGODB DATABASE) ---
The AI has remembered the following facts about the user from previous turns:
${lines.join('\n')}
Use these facts naturally when responding to the user or when asked questions about the user!
--- END STORED USER MEMORIES ---`;
}
