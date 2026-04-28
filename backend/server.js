const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const HuoshanService = require('./huoshanService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只允许上传图片文件'));
  }
});

app.use('/uploads', express.static(uploadDir));

function getConfig(keyName) {
  const row = db.prepare('SELECT key_value FROM configs WHERE key_name = ?').get(keyName);
  return row ? row.key_value : null;
}

app.get('/api/config', (req, res) => {
  const apiKey = getConfig('huoshan_api_key');
  const modelName = getConfig('huoshan_model_name');
  const codeModelName = getConfig('huoshan_code_model_name');
  
  res.json({
    hasApiKey: !!apiKey,
    modelName: modelName || 'doubao-seed-1.8',
    codeModelName: codeModelName || 'doubao-seed-1.8'
  });
});

app.post('/api/config', (req, res) => {
  const { apiKey, modelName, codeModelName } = req.body;
  
  const upsert = db.prepare(`
    INSERT INTO configs (key_name, key_value) VALUES (?, ?)
    ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value
  `);
  
  if (apiKey !== undefined) {
    upsert.run('huoshan_api_key', apiKey);
  }
  if (modelName !== undefined) {
    upsert.run('huoshan_model_name', modelName);
  }
  if (codeModelName !== undefined) {
    upsert.run('huoshan_code_model_name', codeModelName);
  }
  
  res.json({ success: true });
});

app.post('/api/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const DEFAULT_VISION_MODEL = 'doubao-seed-1-8-lite-260215';
    const DEFAULT_CODE_MODEL = 'doubao-seed-1-8-lite-260215';
    
    const apiKey = req.body.apiKey || getConfig('huoshan_api_key');
    const modelName = req.body.modelName || getConfig('huoshan_model_name') || DEFAULT_VISION_MODEL;
    const codeModelName = req.body.codeModelName || getConfig('huoshan_code_model_name') || DEFAULT_CODE_MODEL;

    if (!apiKey) {
      return res.status(400).json({ error: '请先配置火山方舟 API Key' });
    }

    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, 'base64');
    const imageMimeType = req.file.mimetype || 'image/jpeg';
    const imageUrl = `/uploads/${req.file.filename}`;

    const huoshanService = new HuoshanService(apiKey, modelName, codeModelName);

    console.log('正在分析图片...');
    const imageDescription = await huoshanService.analyzeImage(imageBase64, imageMimeType);
    console.log('图片分析完成:', imageDescription.substring(0, 100) + '...');

    const imageDimensions = { width: 400, height: 400 };

    console.log('正在生成 CSS 代码...');
    const cssCode = await huoshanService.generateCSS(imageDescription, imageDimensions);
    console.log('CSS 代码生成完成');

    const result = db.prepare(`
      INSERT INTO artworks (image_url, css_code, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(imageUrl, cssCode);

    res.json({
      success: true,
      artworkId: result.lastInsertRowid,
      imageUrl,
      cssCode,
      imageDescription
    });

  } catch (error) {
    console.error('转换错误:', error);
    if (req.file) {
      const resolvedPath = path.resolve(req.file.path);
      if (resolvedPath.startsWith(uploadDir + path.sep) || resolvedPath === uploadDir) {
        fs.unlink(resolvedPath, (err) => {
          if (err) console.error('清理上传文件失败:', err);
        });
      }
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/artworks/:id/publish', (req, res) => {
  try {
    const { id } = req.params;
    
    const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    if (!artwork) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    db.prepare(`
      UPDATE artworks 
      SET is_published = 1, published_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('发布错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/artworks/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    
    const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    if (!artwork) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    db.prepare('UPDATE artworks SET likes = likes + 1 WHERE id = ?').run(id);
    
    const updated = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    res.json({ success: true, likes: updated.likes });
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artworks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    
    if (!artwork) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    res.json(artwork);
  } catch (error) {
    console.error('获取作品错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gallery', (req, res) => {
  try {
    const { sort = 'time', page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    
    let orderBy = 'published_at DESC';
    if (sort === 'likes') {
      orderBy = 'likes DESC, published_at DESC';
    }
    
    const artworks = db.prepare(`
      SELECT id, image_url, css_code, created_at, published_at, likes, is_published
      FROM artworks 
      WHERE is_published = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(limitNum, offset);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM artworks WHERE is_published = 1
    `).get();
    
    res.json({
      artworks,
      total: total.count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total.count / limitNum)
    });
  } catch (error) {
    console.error('获取画廊错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PureCSSart 后端服务运行在 http://localhost:${PORT}`);
});
