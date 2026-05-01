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

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
  const { apiKey, modelName, codeModelName, baseUrl } = req.body;
  
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
  if (baseUrl !== undefined) {
    upsert.run('huoshan_base_url', baseUrl);
  }
  
  res.json({ success: true });
});

app.post('/api/config/test', async (req, res) => {
  try {
    const { apiKey, baseUrl, modelName } = req.body;
    
    if (!apiKey || apiKey === 'test_mode') {
      return res.json({ 
        success: false, 
        message: '需要有效的 API Key 才能进行连接测试' 
      });
    }

    const testBaseUrl = baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
    const testModelName = modelName || 'doubao-seed-1-8-lite-260215';
    
    let chatEndpoint;
    if (testBaseUrl.includes('volces.com')) {
      chatEndpoint = `${testBaseUrl}/chat/completions`;
    } else {
      chatEndpoint = `${testBaseUrl}/chat/completions`;
    }

    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: testModelName,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ 
        success: true, 
        message: `连接成功！模型 ${testModelName} 可用。` 
      });
    } else {
      const errorText = await response.text();
      let errorMessage = `API 返回错误 (${response.status})`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error.message || errorData.error || errorMessage;
        }
      } catch (e) {
        // 使用原始错误文本
      }
      
      return res.json({ 
        success: false, 
        message: errorMessage 
      });
    }

  } catch (error) {
    console.error('API 测试错误:', error);
    return res.json({ 
      success: false, 
      message: `连接失败: ${error.message || '网络错误'}` 
    });
  }
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

app.post('/api/artworks/:id/snapshots', (req, res) => {
  try {
    const { id } = req.params;
    const { cssCode } = req.body;
    
    const artwork = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
    if (!artwork) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    const maxIndex = db.prepare(
      'SELECT MAX(snapshot_index) as max_idx FROM snapshots WHERE artwork_id = ?'
    ).get(id);
    const nextIndex = (maxIndex?.max_idx || -1) + 1;
    
    const result = db.prepare(`
      INSERT INTO snapshots (artwork_id, css_code, snapshot_index)
      VALUES (?, ?, ?)
    `).run(id, cssCode, nextIndex);
    
    res.json({
      success: true,
      snapshotId: result.lastInsertRowid,
      snapshotIndex: nextIndex
    });
  } catch (error) {
    console.error('创建快照错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artworks/:id/snapshots', (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshots = db.prepare(`
      SELECT id, artwork_id, snapshot_index, created_at
      FROM snapshots 
      WHERE artwork_id = ?
      ORDER BY snapshot_index ASC
    `).all(id);
    
    res.json({
      snapshots,
      total: snapshots.length
    });
  } catch (error) {
    console.error('获取快照列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/snapshots/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const snapshot = db.prepare(`
      SELECT s.*, a.image_url as artwork_image
      FROM snapshots s
      LEFT JOIN artworks a ON s.artwork_id = a.id
      WHERE s.id = ?
    `).get(id);
    
    if (!snapshot) {
      return res.status(404).json({ error: '快照不存在' });
    }
    
    res.json(snapshot);
  } catch (error) {
    console.error('获取快照错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: '需要提供经纬度坐标 (lat, lon)' });
    }
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,cloud_cover&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const weatherCode = data.current.weather_code;
    let weatherType = 'sunny';
    let weatherDescription = '晴天';
    
    if (weatherCode >= 45 && weatherCode <= 48) {
      weatherType = 'foggy';
      weatherDescription = '雾';
    } else if (weatherCode >= 51 && weatherCode <= 57) {
      weatherType = 'drizzle';
      weatherDescription = '毛毛雨';
    } else if (weatherCode >= 61 && weatherCode <= 67) {
      weatherType = 'rainy';
      weatherDescription = '雨天';
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      weatherType = 'snowy';
      weatherDescription = '雪天';
    } else if (weatherCode >= 80 && weatherCode <= 82) {
      weatherType = 'rainy';
      weatherDescription = '阵雨';
    } else if (weatherCode >= 95) {
      weatherType = 'stormy';
      weatherDescription = '雷暴';
    } else if (data.current.cloud_cover > 50) {
      weatherType = 'cloudy';
      weatherDescription = '多云';
    }
    
    res.json({
      success: true,
      weather: {
        type: weatherType,
        description: weatherDescription,
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        cloudCover: data.current.cloud_cover,
        weatherCode: weatherCode,
        timezone: data.timezone
      }
    });
  } catch (error) {
    console.error('获取天气错误:', error);
    res.status(500).json({ error: '获取天气信息失败: ' + error.message });
  }
});

app.get('/api/aura-config', (req, res) => {
  try {
    const configKeys = [
      'aura_time_enabled',
      'aura_weather_enabled',
      'aura_mouse_enabled',
      'aura_time_offset',
      'aura_weather_update_interval'
    ];
    
    const config = {};
    configKeys.forEach(key => {
      const row = db.prepare('SELECT key_value FROM configs WHERE key_name = ?').get(key);
      if (key.includes('enabled')) {
        config[key] = row ? row.key_value === 'true' : true;
      } else {
        config[key] = row ? row.key_value : null;
      }
    });
    
    res.json({
      timeEnabled: config.aura_time_enabled,
      weatherEnabled: config.aura_weather_enabled,
      mouseEnabled: config.aura_mouse_enabled,
      timeOffset: config.aura_time_offset,
      weatherUpdateInterval: config.aura_weather_update_interval
    });
  } catch (error) {
    console.error('获取Aura配置错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/aura-config', (req, res) => {
  try {
    const { timeEnabled, weatherEnabled, mouseEnabled, timeOffset, weatherUpdateInterval } = req.body;
    
    const upsert = db.prepare(`
      INSERT INTO configs (key_name, key_value) VALUES (?, ?)
      ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value
    `);
    
    if (timeEnabled !== undefined) {
      upsert.run('aura_time_enabled', timeEnabled.toString());
    }
    if (weatherEnabled !== undefined) {
      upsert.run('aura_weather_enabled', weatherEnabled.toString());
    }
    if (mouseEnabled !== undefined) {
      upsert.run('aura_mouse_enabled', mouseEnabled.toString());
    }
    if (timeOffset !== undefined) {
      upsert.run('aura_time_offset', timeOffset.toString());
    }
    if (weatherUpdateInterval !== undefined) {
      upsert.run('aura_weather_update_interval', weatherUpdateInterval.toString());
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存Aura配置错误:', error);
    res.status(500).json({ error: error.message });
  }
});

function parseCSSFeatures(cssCode) {
  const colors = [];
  const colorRegex = /#([0-9a-fA-F]{3,6})|rgb\(([^)]+)\)|rgba\(([^)]+)\)|hsl\(([^)]+)\)|hsla\(([^)]+)\)/g;
  let match;
  while ((match = colorRegex.exec(cssCode)) !== null) {
    colors.push(match[0]);
  }
  
  const animations = [];
  const animRegex = /@keyframes\s+([a-zA-Z0-9_-]+)/g;
  while ((match = animRegex.exec(cssCode)) !== null) {
    animations.push(match[1]);
  }
  
  const shapes = [];
  if (cssCode.includes('border-radius')) shapes.push('rounded');
  if (cssCode.includes('circle')) shapes.push('circle');
  if (cssCode.includes('clip-path')) shapes.push('clipped');
  if (cssCode.includes('triangle') || cssCode.includes('polygon')) shapes.push('polygon');
  if (cssCode.includes('linear-gradient') || cssCode.includes('radial-gradient')) shapes.push('gradient');
  
  const transforms = [];
  if (cssCode.includes('rotate')) transforms.push('rotate');
  if (cssCode.includes('scale')) transforms.push('scale');
  if (cssCode.includes('translate')) transforms.push('translate');
  if (cssCode.includes('skew')) transforms.push('skew');
  
  return {
    colors: [...new Set(colors)],
    animations,
    shapes,
    transforms,
    rawCss: cssCode
  };
}

function smoothBlendFusion(css1, css2, ratio = 0.5) {
  const f1 = parseCSSFeatures(css1);
  const f2 = parseCSSFeatures(css2);
  
  let blendedCSS = `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.css-art-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: ${1 - ratio};
  animation: blendFade1 8s ease-in-out infinite;
}

.css-art-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: ${ratio};
  animation: blendFade2 8s ease-in-out infinite;
}

@keyframes blendFade1 {
  0%, 100% { opacity: ${1 - ratio}; transform: scale(1); }
  50% { opacity: ${(1 - ratio) * 0.7}; transform: scale(1.02); }
}

@keyframes blendFade2 {
  0%, 100% { opacity: ${ratio}; transform: scale(1); }
  50% { opacity: ${ratio * 0.7}; transform: scale(0.98); }
}
`;

  const allColors = [...f1.colors.slice(0, 3), ...f2.colors.slice(0, 3)];
  if (allColors.length > 0) {
    blendedCSS += `
.css-art-container {
  background: linear-gradient(135deg, ${allColors.slice(0, Math.min(4, allColors.length)).join(', ') || '#1a1a25, #2a2a3a'});
}
`;
  }

  return blendedCSS;
}

function collisionFusion(css1, css2) {
  const f1 = parseCSSFeatures(css1);
  const f2 = parseCSSFeatures(css2);
  
  const color1 = f1.colors[0] || '#ff6b6b';
  const color2 = f2.colors[0] || '#4ecdc4';
  
  return `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0f, #1a1a25);
}

.css-art-container::before {
  content: '';
  position: absolute;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, ${color1}99, ${color1}00);
  border-radius: 50%;
  animation: collideLeft 4s ease-in-out infinite;
}

.css-art-container::after {
  content: '';
  position: absolute;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, ${color2}99, ${color2}00);
  border-radius: 50%;
  animation: collideRight 4s ease-in-out infinite;
}

@keyframes collideLeft {
  0% { left: -150px; top: 50%; transform: translate(0, -50%) scale(1); }
  40% { left: 40%; top: 50%; transform: translate(0, -50%) scale(1.2); }
  50% { left: 45%; top: 50%; transform: translate(0, -50%) scale(1.5); opacity: 0.8; }
  60% { left: 40%; top: 50%; transform: translate(0, -50%) scale(1.2); }
  100% { left: 110%; top: 50%; transform: translate(0, -50%) scale(1); }
}

@keyframes collideRight {
  0% { right: -150px; top: 50%; transform: translate(0, -50%) scale(1); }
  40% { right: 40%; top: 50%; transform: translate(0, -50%) scale(1.2); }
  50% { right: 45%; top: 50%; transform: translate(0, -50%) scale(1.5); opacity: 0.8; }
  60% { right: 40%; top: 50%; transform: translate(0, -50%) scale(1.2); }
  100% { right: 110%; top: 50%; transform: translate(0, -50%) scale(1); }
}

.css-art-container .collision-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: particleExplode 2s ease-out infinite;
}

@keyframes particleExplode {
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(3); opacity: 0.5; }
  100% { transform: scale(0); opacity: 0; }
}
`;
}

function morphFusion(css1, css2) {
  const f1 = parseCSSFeatures(css1);
  const f2 = parseCSSFeatures(css2);
  
  const allColors = [...(f1.colors.length > 0 ? f1.colors : ['#ff6b6b', '#feca57']), ...(f2.colors.length > 0 ? f2.colors : ['#4ecdc4', '#45b7d1'])];
  
  return `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0f, #1a1a25);
}

.css-art-container .morph-shape {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, ${allColors[0] || '#ff6b6b'}, ${allColors[1] || '#feca57'});
  animation: morphAnimation 6s ease-in-out infinite;
  box-shadow: 0 0 60px ${allColors[0] || '#ff6b6b'}66;
}

.css-art-container .morph-shape-2 {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, ${allColors[2] || '#4ecdc4'}, ${allColors[3] || '#45b7d1'});
  animation: morphAnimation2 6s ease-in-out infinite;
  animation-delay: 1s;
  box-shadow: 0 0 60px ${allColors[2] || '#4ecdc4'}66;
  mix-blend-mode: screen;
}

@keyframes morphAnimation {
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  25% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
    transform: translate(-50%, -50%) rotate(90deg) scale(1.1);
  }
  50% {
    border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
    transform: translate(-50%, -50%) rotate(180deg) scale(0.9);
  }
  75% {
    border-radius: 70% 30% 50% 50% / 30% 70% 50% 60%;
    transform: translate(-50%, -50%) rotate(270deg) scale(1.05);
  }
}

@keyframes morphAnimation2 {
  0%, 100% {
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    transform: translate(-50%, -50%) rotate(45deg) scale(0.8);
    opacity: 0.8;
  }
  25% {
    border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
    transform: translate(-50%, -50%) rotate(135deg) scale(1);
    opacity: 0.6;
  }
  50% {
    border-radius: 50%;
    transform: translate(-50%, -50%) rotate(225deg) scale(0.9);
    opacity: 0.9;
  }
  75% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
    transform: translate(-50%, -50%) rotate(315deg) scale(0.85);
    opacity: 0.7;
  }
}
`;
}

app.post('/api/fusions', (req, res) => {
  try {
    const { artwork1Id, artwork2Id, fusionType, ratio = 0.5 } = req.body;
    
    if (!artwork1Id || !artwork2Id) {
      return res.status(400).json({ error: '需要提供两个作品ID' });
    }
    
    const artwork1 = db.prepare('SELECT * FROM artworks WHERE id = ?').get(artwork1Id);
    const artwork2 = db.prepare('SELECT * FROM artworks WHERE id = ?').get(artwork2Id);
    
    if (!artwork1 || !artwork2) {
      return res.status(404).json({ error: '作品不存在' });
    }
    
    let resultCss;
    const validFusionType = ['smooth', 'collision', 'morph'].includes(fusionType) ? fusionType : 'smooth';
    
    switch (validFusionType) {
      case 'smooth':
        resultCss = smoothBlendFusion(artwork1.css_code, artwork2.css_code, ratio);
        break;
      case 'collision':
        resultCss = collisionFusion(artwork1.css_code, artwork2.css_code);
        break;
      case 'morph':
        resultCss = morphFusion(artwork1.css_code, artwork2.css_code);
        break;
      default:
        resultCss = smoothBlendFusion(artwork1.css_code, artwork2.css_code, ratio);
    }
    
    const result = db.prepare(`
      INSERT INTO fusions (artwork1_id, artwork2_id, fusion_type, result_css_code)
      VALUES (?, ?, ?, ?)
    `).run(artwork1Id, artwork2Id, validFusionType, resultCss);
    
    res.json({
      success: true,
      fusionId: result.lastInsertRowid,
      fusionType: validFusionType,
      cssCode: resultCss,
      artwork1: {
        id: artwork1.id,
        imageUrl: artwork1.image_url
      },
      artwork2: {
        id: artwork2.id,
        imageUrl: artwork2.image_url
      }
    });
  } catch (error) {
    console.error('作品融合错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/fusions/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const fusion = db.prepare(`
      SELECT f.*, 
             a1.image_url as artwork1_image,
             a2.image_url as artwork2_image
      FROM fusions f
      LEFT JOIN artworks a1 ON f.artwork1_id = a1.id
      LEFT JOIN artworks a2 ON f.artwork2_id = a2.id
      WHERE f.id = ?
    `).get(id);
    
    if (!fusion) {
      return res.status(404).json({ error: '融合记录不存在' });
    }
    
    res.json(fusion);
  } catch (error) {
    console.error('获取融合记录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/artworks/selectable', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    
    const artworks = db.prepare(`
      SELECT id, image_url, created_at, is_published
      FROM artworks
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limitNum);
    
    res.json({
      artworks,
      total: artworks.length
    });
  } catch (error) {
    console.error('获取可选作品错误:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PureCSSart 后端服务运行在 http://localhost:${PORT}`);
});
