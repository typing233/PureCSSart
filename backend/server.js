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

function parseCSSStructure(cssCode) {
  const layers = {
    background: {
      containerRules: '',
      backgroundProps: {}
    },
    shapes: [],
    animations: {},
    pseudos: []
  };

  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  const keyframesRegex = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{((?:[^{}]*\{[^{}]*\}[^{}]*)*)\}/g;
  
  let match;
  const keyframesMap = {};
  while ((match = keyframesRegex.exec(cssCode)) !== null) {
    keyframesMap[match[1]] = match[0];
    layers.animations[match[1]] = match[0];
  }

  const cssWithoutKeyframes = cssCode.replace(keyframesRegex, '');
  
  while ((match = ruleRegex.exec(cssWithoutKeyframes)) !== null) {
    const selector = match[1].trim();
    const rules = match[2].trim();
    
    if (selector.includes('.css-art-container') && 
        !selector.includes('::before') && 
        !selector.includes('::after') &&
        !selector.includes('.css-art-container ')) {
      layers.background.containerRules = rules;
      
      const bgMatch = rules.match(/background\s*:\s*([^;]+)/i);
      if (bgMatch) layers.background.backgroundProps.background = bgMatch[1].trim();
      
      const bgColorMatch = rules.match(/background-color\s*:\s*([^;]+)/i);
      if (bgColorMatch) layers.background.backgroundProps.backgroundColor = bgColorMatch[1].trim();
      
      const bgImageMatch = rules.match(/background-image\s*:\s*([^;]+)/i);
      if (bgImageMatch) layers.background.backgroundProps.backgroundImage = bgImageMatch[1].trim();
      
    } else if (selector.includes('::before') || selector.includes('::after')) {
      layers.pseudos.push({
        selector: selector,
        rules: rules,
        isBefore: selector.includes('::before')
      });
    } else if (selector.includes('.css-art-container .') || selector.startsWith('.')) {
      const classNameMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
      if (classNameMatch) {
        layers.shapes.push({
          selector: selector,
          className: classNameMatch[1],
          rules: rules,
          fullRule: `${selector} { ${rules} }`
        });
      }
    }
  }

  layers.rawCss = cssCode;
  layers.keyframesMap = keyframesMap;
  
  return layers;
}

function blendColor(color1, color2, ratio) {
  const parseHex = (hex) => {
    const h = hex.replace('#', '');
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16)
      };
    }
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  };

  const toHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  if (color1.startsWith('#') && color2.startsWith('#')) {
    const c1 = parseHex(color1);
    const c2 = parseHex(color2);
    return toHex(
      c1.r * (1 - ratio) + c2.r * ratio,
      c1.g * (1 - ratio) + c2.g * ratio,
      c1.b * (1 - ratio) + c2.b * ratio
    );
  }
  
  return ratio < 0.5 ? color1 : color2;
}

function smoothBlendFusion(css1, css2, ratio = 0.5) {
  const s1 = parseCSSStructure(css1);
  const s2 = parseCSSStructure(css2);
  
  let result = '';
  
  result += `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;
  
  if (s1.background.backgroundProps.background && s2.background.backgroundProps.background) {
    result += `
  background: linear-gradient(135deg, 
    ${s1.background.backgroundProps.background.replace(/linear-gradient\([^)]+\)\s*/, '') || '#1a1a25'},
    ${s2.background.backgroundProps.background.replace(/linear-gradient\([^)]+\)\s*/, '') || '#2a2a3a'}
  );
`;
  } else if (s1.background.backgroundProps.background) {
    result += `  background: ${s1.background.backgroundProps.background};\n`;
  } else if (s2.background.backgroundProps.background) {
    result += `  background: ${s2.background.backgroundProps.background};\n`;
  } else {
    result += `  background: linear-gradient(135deg, #1a1a25, #2a2a3a);\n`;
  }
  
  result += `}\n`;

  const allShapes = [...s1.shapes, ...s2.shapes];
  const usedClassNames = new Set();
  let shapeIndex = 0;

  allShapes.forEach((shape, idx) => {
    const isFromFirst = idx < s1.shapes.length;
    const weight = isFromFirst ? (1 - ratio) : ratio;
    
    if (weight > 0.1) {
      const baseClassName = shape.className + (usedClassNames.has(shape.className) ? `_${shapeIndex++}` : '');
      usedClassNames.add(baseClassName);
      
      let modifiedRules = shape.rules;
      
      if (modifiedRules.includes('opacity:')) {
        modifiedRules = modifiedRules.replace(/opacity:\s*[\d.]+/g, `opacity: ${weight}`);
      } else {
        modifiedRules = `opacity: ${weight}; ` + modifiedRules;
      }
      
      const newSelector = `.css-art-container .${baseClassName}`;
      result += `\n${newSelector} {\n  ${modifiedRules}\n}\n`;
    }
  });

  const allKeyframes = { ...s1.animations, ...s2.animations };
  Object.values(allKeyframes).forEach(kf => {
    result += '\n' + kf + '\n';
  });

  return result;
}

function collisionFusion(css1, css2) {
  const s1 = parseCSSStructure(css1);
  const s2 = parseCSSStructure(css2);
  
  let result = '';
  
  result += `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0f, #1a1a25);
}

.css-art-container .fusion-divider {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: translateX(-50%);
  z-index: 100;
  animation: dividerPulse 3s ease-in-out infinite;
}

@keyframes dividerPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
`;

  const usedClassNames = new Set();
  let shapeIndex = 0;

  s1.shapes.forEach((shape) => {
    const baseClassName = shape.className + (usedClassNames.has(shape.className) ? `_a${shapeIndex++}` : 'a');
    usedClassNames.add(baseClassName);
    
    let modifiedRules = shape.rules;
    
    if (!modifiedRules.includes('clip-path:') && !modifiedRules.includes('left:') && !modifiedRules.includes('right:')) {
      modifiedRules = `clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%); ` + modifiedRules;
    } else {
      modifiedRules = modifiedRules.replace(/left:\s*([^;]+)/g, (match, val) => {
        const num = parseFloat(val);
        if (!isNaN(num) && val.includes('%')) {
          return `left: ${num * 0.5}%`;
        }
        return match;
      });
    }
    
    const newSelector = `.css-art-container .${baseClassName}`;
    result += `\n${newSelector} {\n  ${modifiedRules}\n}\n`;
  });

  s2.shapes.forEach((shape) => {
    const baseClassName = shape.className + (usedClassNames.has(shape.className) ? `_b${shapeIndex++}` : 'b');
    usedClassNames.add(baseClassName);
    
    let modifiedRules = shape.rules;
    
    if (!modifiedRules.includes('clip-path:') && !modifiedRules.includes('left:') && !modifiedRules.includes('right:')) {
      modifiedRules = `clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%); ` + modifiedRules;
    } else {
      modifiedRules = modifiedRules.replace(/left:\s*([^;]+)/g, (match, val) => {
        const num = parseFloat(val);
        if (!isNaN(num) && val.includes('%')) {
          return `left: ${50 + num * 0.5}%`;
        }
        return match;
      });
    }
    
    const newSelector = `.css-art-container .${baseClassName}`;
    result += `\n${newSelector} {\n  ${modifiedRules}\n}\n`;
  });

  const allKeyframes = { ...s1.animations, ...s2.animations };
  Object.values(allKeyframes).forEach(kf => {
    result += '\n' + kf + '\n';
  });

  return result;
}

function morphFusion(css1, css2) {
  const s1 = parseCSSStructure(css1);
  const s2 = parseCSSStructure(css2);
  
  let result = '';
  
  result += `
.css-art-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;
  
  if (s2.background.backgroundProps.background) {
    result += `  background: ${s2.background.backgroundProps.background};\n`;
  } else if (s1.background.backgroundProps.background) {
    result += `  background: ${s1.background.backgroundProps.background};\n`;
  } else {
    result += `  background: linear-gradient(135deg, #1a1a25, #2a2a3a);\n`;
  }
  
  result += `}\n`;

  const usedClassNames = new Set();
  let shapeIndex = 0;

  s1.shapes.forEach((shape) => {
    const baseClassName = shape.className + (usedClassNames.has(shape.className) ? `_m${shapeIndex++}` : 'm');
    usedClassNames.add(baseClassName);
    
    let modifiedRules = shape.rules;
    
    if (s2.shapes.length > 0) {
      const donorShape = s2.shapes[shapeIndex % s2.shapes.length];
      
      const bgMatch = donorShape.rules.match(/background\s*:\s*([^;]+)/i);
      if (bgMatch) {
        if (modifiedRules.match(/background\s*:/i)) {
          modifiedRules = modifiedRules.replace(/background\s*:\s*[^;]+/gi, `background: ${bgMatch[1]}`);
        } else if (modifiedRules.match(/background-color\s*:/i)) {
          modifiedRules = modifiedRules.replace(/background-color\s*:\s*[^;]+/gi, `background: ${bgMatch[1]}`);
        } else {
          modifiedRules = `background: ${bgMatch[1]}; ` + modifiedRules;
        }
      }
      
      const boxShadowMatch = donorShape.rules.match(/box-shadow\s*:\s*([^;]+)/i);
      if (boxShadowMatch) {
        if (modifiedRules.match(/box-shadow\s*:/i)) {
          modifiedRules = modifiedRules.replace(/box-shadow\s*:\s*[^;]+/gi, `box-shadow: ${boxShadowMatch[1]}`);
        } else {
          modifiedRules = `box-shadow: ${boxShadowMatch[1]}; ` + modifiedRules;
        }
      }
      
      const animMatch = donorShape.rules.match(/animation\s*:\s*([^;]+)/i);
      if (animMatch) {
        if (modifiedRules.match(/animation\s*:/i)) {
          modifiedRules = modifiedRules.replace(/animation\s*:\s*[^;]+/gi, `animation: ${animMatch[1]}`);
        } else {
          modifiedRules = `animation: ${animMatch[1]}; ` + modifiedRules;
        }
      }
    }
    
    const newSelector = `.css-art-container .${baseClassName}`;
    result += `\n${newSelector} {\n  ${modifiedRules}\n}\n`;
  });

  const allKeyframes = { ...s1.animations, ...s2.animations };
  Object.values(allKeyframes).forEach(kf => {
    result += '\n' + kf + '\n';
  });

  return result;
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
