import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateAIResponse, processCodeAssistantTask } from '../services/aiService.js';
import { generateAIImage } from '../services/imageService.js';
import { translateText } from '../services/translationService.js';
import { getUserMemories, saveMemory, deleteMemory, clearUserMemories } from '../services/memoryService.js';
import { getMongoStatus } from '../db/mongo.js';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// POST /api/chat/translate - Phase 14 On-The-Fly Translation Endpoint
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required for translation.' });
    }

    const translated = await translateText(text, targetLanguage || 'en');
    analyticsService.trackFeature('translation');
    res.json({ translatedText: translated, targetLanguage: targetLanguage || 'en' });
  } catch (err) {
    console.error('Error in translation endpoint:', err);
    res.status(500).json({ error: 'Failed to complete translation.' });
  }
});

// POST /api/chat/generate-image - AI Image Generation Endpoint
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Image prompt is required.' });
    }

    const response = await generateAIImage(prompt);
    analyticsService.trackFeature('image_generation');
    analyticsService.trackMessage({ userId: 'system', model: 'gemini', command: '/image' });
    res.json({ response });
  } catch (err) {
    console.error('Error generating image:', err);
    res.status(500).json({ error: 'Failed to generate image.' });
  }
});

// POST /api/chat/code-assistant - Phase 12 Code Assistant (Explain, Find Bugs, Optimize, Complexity)
router.post('/code-assistant', async (req, res) => {
  try {
    const { code, language, mode, model } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    const analysis = await processCodeAssistantTask(
      code,
      language || 'auto',
      mode || 'full',
      model || 'auto'
    );
    analyticsService.trackFeature('code_assistant', model || 'auto');
    analyticsService.trackMessage({ userId: 'system', model: model || 'auto', command: '/code' });

    res.json({ analysis });
  } catch (err) {
    console.error('Error in code assistant endpoint:', err);
    res.status(500).json({ error: 'Failed to complete code assistant analysis.' });
  }
});

// Helper to extract optional user ID from request (token or query/body)
function resolveUserId(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) return decoded.id;
    } catch {
      // Invalid token fallback to request body/query or default
    }
  }
  return req.body?.userId || req.query?.userId || 'default_user';
}

// POST /api/chat/generate - Generate AI response for a prompt (with MongoDB memory extraction, multi-language & context)
router.post('/generate', async (req, res) => {
  const io = req.app.get('io');
  const startTime = Date.now();
  try {
    const { prompt, history, attachments, model, targetLanguage, language } = req.body;
    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Prompt or attachment is required.' });
    }

    const userId = resolveUserId(req);
    const chosenLang = targetLanguage || language || 'en';

    if (io) {
      io.emit('bot_typing_start', { model: model || 'auto' });
    }

    const result = await generateAIResponse(
      prompt || '',
      history || [],
      attachments || [],
      model || 'auto',
      userId,
      chosenLang
    );

    const latencyMs = Date.now() - startTime;
    const aiResponse = typeof result === 'string' ? result : result.response;
    const newMemories = result.newMemories || [];
    const userMemories = result.userMemories || [];

    // Track in Analytics Service
    const detectedCmd = (prompt && prompt.trim().startsWith('/')) ? prompt.trim().split(' ')[0] : null;
    analyticsService.trackMessage({
      userId,
      isGuest: userId === 'default_user' || userId.startsWith('guest'),
      model: model || 'auto',
      latencyMs,
      command: detectedCmd,
      language: chosenLang
    });

    if (io) {
      io.emit('bot_typing_stop');
      io.emit('instant_message_received', {
        type: 'ai_response',
        response: aiResponse,
        model: model || 'auto',
        timestamp: new Date().toISOString(),
        newMemories: newMemories
      });
    }

    res.json({
      response: aiResponse,
      newMemories: newMemories,
      totalMemoriesCount: userMemories.length
    });
  } catch (err) {
    if (io) {
      io.emit('bot_typing_stop');
    }
    console.error('Error generating AI response:', err);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
});

// --- AI Memory CRUD Endpoints ---

// GET /api/chat/memory - Retrieve all memories & MongoDB status
router.get('/memory', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const memories = await getUserMemories(userId);
    const mongoStatus = getMongoStatus();
    res.json({ memories, mongoStatus });
  } catch (err) {
    console.error('Error fetching AI memories:', err);
    res.status(500).json({ error: 'Failed to fetch AI memories.' });
  }
});

// POST /api/chat/memory - Manually store or update a memory
router.post('/memory', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { key, value, category, rawText } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required.' });
    }

    const memory = await saveMemory(userId, key, value, rawText || '', category || 'fact');
    const mongoStatus = getMongoStatus();
    res.status(201).json({ memory, mongoStatus });
  } catch (err) {
    console.error('Error saving AI memory:', err);
    res.status(500).json({ error: 'Failed to save AI memory.' });
  }
});

// DELETE /api/chat/memory/:id - Delete a specific memory item
router.delete('/memory/:id', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const success = await deleteMemory(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Memory item not found or already deleted.' });
    }
    res.json({ message: 'Memory item deleted successfully.' });
  } catch (err) {
    console.error('Error deleting AI memory:', err);
    res.status(500).json({ error: 'Failed to delete AI memory.' });
  }
});

// DELETE /api/chat/memory - Clear all memories for user
router.delete('/memory', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    await clearUserMemories(userId);
    res.json({ message: 'All memories cleared successfully.' });
  } catch (err) {
    console.error('Error clearing AI memories:', err);
    res.status(500).json({ error: 'Failed to clear AI memories.' });
  }
});

// GET /api/chat/search - Phase 16 Universal Multi-Category Search Endpoint
router.get('/search', async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const query = (req.query.q || '').trim().toLowerCase();

    const AVAILABLE_COMMANDS = [
      { command: '/image', name: 'AI Image Generator', desc: 'Generate high-resolution AI artwork and illustrations', icon: '🎨' },
      { command: '/code', name: 'Code AI Assistant', desc: 'Debug, explain, optimize code & analyze complexity (Phase 12)', icon: '💻' },
      { command: '/web', name: 'Web Search & Intelligence', desc: 'Search the live web for real-time answers and facts', icon: '🌐' },
      { command: '/translate', name: 'Multi-Language Translator', desc: 'Translate text between 16+ international languages (Phase 14)', icon: '🌐' },
      { command: '/memory', name: 'MongoDB AI Memory Manager', desc: 'View, store, and manage AI user memories', icon: '🧠' },
      { command: '/voice', name: 'Voice Assistant Settings', desc: 'Speech-to-text recognition and text-to-speech controls', icon: '🎙️' },
      { command: '/prompt', name: 'Prompt Library & Starters', desc: 'Browse curated prompt templates (Phase 11)', icon: '📚' },
      { command: '/analytics', name: 'Analytics Dashboard & Admin Panel', desc: 'Real-time metrics, API usage & admin directory (Phase 15)', icon: '📊' },
      { command: '/clear', name: 'Clear Current Conversation', desc: 'Clear messages in active chat window', icon: '🧹' },
      { command: '/help', name: 'Command Center & System Guide', desc: 'View help documentation and feature guides', icon: '❓' }
    ];

    const ALL_PROMPT_EXAMPLES = [
      { id: 'ex-1', title: 'Explain DSA', category: 'Algorithms', icon: '💡', prompt: 'Explain Data Structures & Algorithms (DSA) from scratch with key concepts and time complexity examples.' },
      { id: 'ex-2', title: 'Generate Resume', category: 'Career', icon: '📄', prompt: 'Generate a clean, modern professional resume template for a Full Stack Software Engineer.' },
      { id: 'ex-3', title: 'Write Email', category: 'Writing', icon: '✉️', prompt: 'Write a professional follow-up email regarding a project update, outlining status and deliverables.' },
      { id: 'ex-4', title: 'SQL Query', category: 'Database', icon: '🗄️', prompt: 'Write an optimized SQL query joining users and orders tables with aggregations and GROUP BY.' },
      { id: 'ex-5', title: 'React Code', category: 'Frontend', icon: '⚛️', prompt: 'Create a clean, modern React functional component using useState, useEffect, and CSS.' },
      { id: 'ex-6', title: 'Debug C++', category: 'Systems', icon: '🛠️', prompt: 'Debug a C++ code snippet with smart pointers, memory leak prevention, and segmentation fault analysis.' },
      { id: 'ex-7', title: 'Generate Image', category: 'AI Image', icon: '🎨', prompt: 'Generate an image of a majestic pirate ship sailing on a stormy ocean at sunset with dramatic lighting.' }
    ];

    // Fetch user conversations & memories
    const userConvs = db.getConversationsByUser ? db.getConversationsByUser(userId, '') : [];
    const memories = await getUserMemories(userId);

    const results = {
      chats: [],
      files: [],
      prompts: [],
      commands: [],
      memories: []
    };

    // 1. Search Chats & Messages
    userConvs.forEach(conv => {
      const titleMatch = conv.title && conv.title.toLowerCase().includes(query);
      const matchingMsgs = Array.isArray(conv.messages) ? conv.messages.filter(m =>
        (m.question && m.question.toLowerCase().includes(query)) ||
        (m.answer && m.answer.toLowerCase().includes(query))
      ) : [];

      if (titleMatch || matchingMsgs.length > 0) {
        results.chats.push({
          id: conv.id,
          title: conv.title || 'Untitled Chat',
          updatedAt: conv.updatedAt || conv.createdAt,
          messageCount: conv.messages ? conv.messages.length : 0,
          matchingSnippet: matchingMsgs.length > 0
            ? (matchingMsgs[0].question || matchingMsgs[0].answer).substring(0, 120) + '...'
            : 'Conversation title match'
        });
      }

      // 2. Search Uploaded Files & Attachments inside conversations
      if (Array.isArray(conv.messages)) {
        conv.messages.forEach(m => {
          if (Array.isArray(m.attachments)) {
            m.attachments.forEach(att => {
              const nameMatch = att.name && att.name.toLowerCase().includes(query);
              const textMatch = att.text && att.text.toLowerCase().includes(query);
              const typeMatch = att.type && att.type.toLowerCase().includes(query);

              if (nameMatch || textMatch || typeMatch || !query) {
                // Avoid duplicate files in list
                if (!results.files.some(f => f.name === att.name && f.convId === conv.id)) {
                  results.files.push({
                    id: att.id || `${conv.id}-${att.name}`,
                    name: att.name,
                    type: att.type || 'file',
                    convId: conv.id,
                    convTitle: conv.title,
                    data: att.data || null,
                    matchedInText: Boolean(textMatch)
                  });
                }
              }
            });
          }
        });
      }
    });

    // 3. Search Prompts
    ALL_PROMPT_EXAMPLES.forEach(p => {
      if (!query || p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || p.prompt.toLowerCase().includes(query)) {
        results.prompts.push(p);
      }
    });

    // 4. Search Commands
    AVAILABLE_COMMANDS.forEach(cmd => {
      if (!query || cmd.command.toLowerCase().includes(query) || cmd.name.toLowerCase().includes(query) || cmd.desc.toLowerCase().includes(query)) {
        results.commands.push(cmd);
      }
    });

    // 5. Search Memories
    memories.forEach(mem => {
      const keyMatch = mem.key && mem.key.toLowerCase().includes(query);
      const valMatch = mem.value && mem.value.toLowerCase().includes(query);
      const catMatch = mem.category && mem.category.toLowerCase().includes(query);

      if (!query || keyMatch || valMatch || catMatch) {
        results.memories.push(mem);
      }
    });

    res.json({
      success: true,
      query,
      resultsCount: results.chats.length + results.files.length + results.prompts.length + results.commands.length + results.memories.length,
      results
    });
  } catch (err) {
    console.error('Error executing universal search:', err);
    res.status(500).json({ error: 'Failed to perform search query.' });
  }
});

// --- Conversations Management ---

// GET /api/chat/conversations - List all conversations for authenticated user
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const conversations = db.getConversationsByUser(req.user.id, searchQuery);
    res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// POST /api/chat/conversations - Create a new conversation
router.post('/conversations', authenticateToken, (req, res) => {
  try {
    const { title } = req.body;
    const conversation = db.createConversation(req.user.id, title || 'New Chat');
    res.status(201).json({ conversation });
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// GET /api/chat/conversations/:id - Get a specific conversation
router.get('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const conversation = db.getConversationById(req.params.id, req.user.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json({ conversation });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// POST /api/chat/conversations/:id/messages - Add Q&A message to conversation
router.post('/conversations/:id/messages', authenticateToken, (req, res) => {
  try {
    const { question, answer, attachments } = req.body;
    if (!question && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Question or attachment is required.' });
    }

    const result = db.addMessageToConversation(req.params.id, req.user.id, {
      question: question || '',
      answer: answer || '',
      attachments: attachments || []
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).json({ error: 'Failed to save message to conversation.' });
  }
});

// PATCH /api/chat/conversations/:id - Rename conversation
router.patch('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'New conversation title is required.' });
    }

    const updated = db.renameConversation(req.params.id, req.user.id, title);
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    res.json({ message: 'Conversation renamed successfully.', conversation: updated });
  } catch (err) {
    console.error('Error renaming conversation:', err);
    res.status(500).json({ error: 'Failed to rename conversation.' });
  }
});

// DELETE /api/chat/conversations/:id - Delete single conversation
router.delete('/conversations/:id', authenticateToken, (req, res) => {
  try {
    const deleted = db.deleteConversation(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    res.json({ message: 'Conversation deleted successfully.' });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

// DELETE /api/chat/conversations - Clear ALL conversations for user
router.delete('/conversations', authenticateToken, (req, res) => {
  try {
    db.clearAllConversationsByUser(req.user.id);
    res.json({ message: 'All conversations cleared successfully.' });
  } catch (err) {
    console.error('Error clearing all conversations:', err);
    res.status(500).json({ error: 'Failed to clear conversations.' });
  }
});

// --- Legacy / Backwards Compatible Endpoints ---

// GET /api/chat/history - Get legacy flat chat history
router.get('/history', authenticateToken, (req, res) => {
  const history = db.getChatHistory(req.user.id);
  res.json({ history });
});

// POST /api/chat/history - Save legacy flat chat history
router.post('/history', authenticateToken, (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages must be an array.' });
  }

  const saved = db.saveChatHistory(req.user.id, messages);
  res.json({ message: 'History saved successfully.', history: saved });
});

export default router;
