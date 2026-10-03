import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GRADES_FILE = path.resolve(DATA_DIR, 'grades.json');
const CONFIGS_FILE = path.resolve(DATA_DIR, 'grading_configs.json');
const SUBJECTS_FILE = path.resolve(DATA_DIR, 'custom_subjects.json');
const DISPENSATIONS_FILE = path.resolve(DATA_DIR, 'dispensations.json');

// In-memory cache for ultra-fast access
let cachedGrades: any[] = [];
let cachedConfigs: Record<string, any> = {};
let cachedSubjects: string[] = [];
let cachedDispensations: any[] = [];

// Load initial data from disk
try {
  if (fs.existsSync(GRADES_FILE)) {
    cachedGrades = JSON.parse(fs.readFileSync(GRADES_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading grades from file:', e);
}

try {
  if (fs.existsSync(CONFIGS_FILE)) {
    cachedConfigs = JSON.parse(fs.readFileSync(CONFIGS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading configs from file:', e);
}

try {
  if (fs.existsSync(SUBJECTS_FILE)) {
    cachedSubjects = JSON.parse(fs.readFileSync(SUBJECTS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading subjects from file:', e);
}

try {
  if (fs.existsSync(DISPENSATIONS_FILE)) {
    cachedDispensations = JSON.parse(fs.readFileSync(DISPENSATIONS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Error loading dispensations from file:', e);
}

function persistGrades() {
  try {
    fs.writeFileSync(GRADES_FILE, JSON.stringify(cachedGrades, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist grades:', err);
  }
}

function persistConfigs() {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(cachedConfigs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist configs:', err);
  }
}

function persistSubjects() {
  try {
    fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(cachedSubjects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist subjects:', err);
  }
}

// SSE (Server-Sent Events) clients for real-time instant broadcast
interface SSEClient {
  id: number;
  res: express.Response;
}

let sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastGradesUpdate(subject?: string) {
  const payload = JSON.stringify({
    type: 'grades_updated',
    subject,
    timestamp: Date.now(),
    grades: cachedGrades,
  });

  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

// --- API ROUTES ---

// 1. GET /api/grades
app.get('/api/grades', (req, res) => {
  const { subject } = req.query;
  if (subject && typeof subject === 'string') {
    const filtered = cachedGrades.filter((g) => g.subject === subject);
    return res.json({ success: true, count: filtered.length, grades: filtered });
  }
  res.json({ success: true, count: cachedGrades.length, grades: cachedGrades });
});

// 2. POST /api/grades
// Saves or merges grades, updates disk and memory, and broadcasts to all clients
app.post('/api/grades', (req, res) => {
  try {
    const { grades, subject, replaceSubject } = req.body;
    if (!Array.isArray(grades)) {
      return res.status(400).json({ error: 'grades must be an array' });
    }

    if (replaceSubject && subject) {
      // Replace all grades for this subject
      const otherGrades = cachedGrades.filter((g) => g.subject !== subject);
      cachedGrades = [...otherGrades, ...grades];
    } else {
      // Smart upsert by id (${studentId}_${subject})
      const map = new Map<string, any>();
      cachedGrades.forEach((g) => {
        const key = g.id || `${g.studentId}_${g.subject}`;
        map.set(key, g);
      });

      grades.forEach((g) => {
        const key = g.id || `${g.studentId}_${g.subject}`;
        map.set(key, g);
      });

      cachedGrades = Array.from(map.values());
    }

    persistGrades();
    broadcastGradesUpdate(subject);

    res.json({
      success: true,
      message: 'Grades saved successfully and broadcasted in real-time',
      count: cachedGrades.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving grades in /api/grades:', error);
    res.status(500).json({ error: 'Internal server error while saving grades' });
  }
});

// 3. Real-Time SSE Stream: GET /api/grades/stream
app.get('/api/grades/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial snapshot on connect
  res.write(`data: ${JSON.stringify({ type: 'connected', grades: cachedGrades, timestamp: Date.now() })}\n\n`);

  // Heartbeat ping every 25 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// 4. Grading Configs API
app.get('/api/grading-configs', (req, res) => {
  res.json({ success: true, configs: cachedConfigs });
});

app.post('/api/grading-configs', (req, res) => {
  try {
    const { configs, subject, config } = req.body;
    if (configs && typeof configs === 'object') {
      cachedConfigs = { ...cachedConfigs, ...configs };
    } else if (subject && config) {
      cachedConfigs[subject] = config;
    }
    persistConfigs();
    res.json({ success: true, configs: cachedConfigs });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save grading configs' });
  }
});

// 5. Custom Subjects Catalog API
app.get('/api/custom-subjects', (req, res) => {
  res.json({ success: true, subjects: cachedSubjects });
});

app.post('/api/custom-subjects', (req, res) => {
  try {
    const { subjects } = req.body;
    if (Array.isArray(subjects)) {
      cachedSubjects = subjects;
      persistSubjects();
    }
    res.json({ success: true, subjects: cachedSubjects });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save subjects' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    gradesCount: cachedGrades.length,
    activeSSEClients: sseClients.length,
    time: new Date().toISOString(),
  });
});

// Mount Vite or serve static dist
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (isProduction && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    // In dev, mount Vite middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
