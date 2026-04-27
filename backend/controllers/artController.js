const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { generateCSSFromImage } = require('../services/volcengineAI');
const db = require('../database');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的图片格式，仅支持 JPEG、PNG、GIF、WebP'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}).single('image');

const handleUpload = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        reject(new Error(`上传错误: ${err.message}`));
      } else if (err) {
        reject(err);
      } else {
        resolve(req.file);
      }
    });
  });
};

const processImage = async (req, res) => {
  try {
    const file = await handleUpload(req, res);
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    const { apiKey, modelId } = req.body;

    if (!apiKey || !modelId) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：apiKey 或 modelId'
      });
    }

    const imageBuffer = fs.readFileSync(file.path);
    const mimeType = file.mimetype;

    const imageUrl = `/uploads/${file.filename}`;

    console.log('正在调用火山引擎AI生成CSS代码...');
    const result = await generateCSSFromImage(apiKey, modelId, imageBuffer, mimeType);

    const artworkUuid = uuidv4();

    await db.runQuery(
      `INSERT INTO artworks (uuid, image_url, css_code, title, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [artworkUuid, imageUrl, result.cssCode, `CSS Artwork - ${file.filename}`]
    );

    const artwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ?`,
      [artworkUuid]
    );

    res.json({
      success: true,
      data: {
        uuid: artworkUuid,
        imageUrl: imageUrl,
        cssCode: result.cssCode,
        usage: result.usage,
        model: result.model,
        artwork: artwork
      }
    });

  } catch (error) {
    console.error('处理图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getArtwork = async (req, res) => {
  try {
    const { uuid } = req.params;

    const artwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ?`,
      [uuid]
    );

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: '作品不存在'
      });
    }

    await db.runQuery(
      `UPDATE artworks SET views = views + 1 WHERE id = ?`,
      [artwork.id]
    );

    res.json({
      success: true,
      data: {
        ...artwork,
        cssCode: artwork.css_code,
        imageUrl: artwork.image_url
      }
    });

  } catch (error) {
    console.error('获取作品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const publishArtwork = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { title } = req.body;

    const artwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ?`,
      [uuid]
    );

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: '作品不存在'
      });
    }

    if (artwork.is_public === 1) {
      return res.status(400).json({
        success: false,
        error: '作品已发布'
      });
    }

    await db.runQuery(
      `UPDATE artworks 
       SET is_public = 1, published_at = datetime('now'), title = ?
       WHERE uuid = ?`,
      [title || `CSS Artwork - ${Date.now()}`, uuid]
    );

    const updatedArtwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ?`,
      [uuid]
    );

    res.json({
      success: true,
      message: '作品已发布到画廊',
      data: updatedArtwork
    });

  } catch (error) {
    console.error('发布作品失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  processImage,
  getArtwork,
  publishArtwork,
  upload
};
