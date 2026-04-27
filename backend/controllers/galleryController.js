const db = require('../database');
const crypto = require('crypto');

const getGallery = async (req, res) => {
  try {
    const { sort = 'latest', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let orderBy = 'published_at DESC';
    if (sort === 'popular') {
      orderBy = 'likes DESC, published_at DESC';
    } else if (sort === 'oldest') {
      orderBy = 'published_at ASC';
    }

    const totalResult = await db.getQuery(
      `SELECT COUNT(*) as total FROM artworks WHERE is_public = 1`
    );
    const total = totalResult.total;

    const artworks = await db.allQuery(
      `SELECT id, uuid, image_url, css_code, title, likes, views, published_at 
       FROM artworks 
       WHERE is_public = 1 
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const formattedArtworks = artworks.map(artwork => ({
      id: artwork.id,
      uuid: artwork.uuid,
      imageUrl: artwork.image_url,
      cssCode: artwork.css_code,
      title: artwork.title,
      likes: artwork.likes,
      views: artwork.views,
      publishedAt: artwork.published_at
    }));

    res.json({
      success: true,
      data: {
        artworks: formattedArtworks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('获取画廊失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const getGalleryItem = async (req, res) => {
  try {
    const { uuid } = req.params;

    const artwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ? AND is_public = 1`,
      [uuid]
    );

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: '作品不存在或未发布'
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
        imageUrl: artwork.image_url,
        publishedAt: artwork.published_at
      }
    });

  } catch (error) {
    console.error('获取作品详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const likeArtwork = async (req, res) => {
  try {
    const { uuid } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';
    
    const likeIdentifier = crypto.createHash('sha256')
      .update(`${uuid}-${ipAddress}-${userAgent}`)
      .digest('hex');

    const artwork = await db.getQuery(
      `SELECT * FROM artworks WHERE uuid = ? AND is_public = 1`,
      [uuid]
    );

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: '作品不存在或未发布'
      });
    }

    const existingLike = await db.getQuery(
      `SELECT * FROM artwork_likes 
       WHERE artwork_id = ? 
       AND (
         (ip_address = ? AND user_agent = ?)
       )`,
      [artwork.id, ipAddress, userAgent]
    );

    if (existingLike) {
      await db.runQuery(
        `DELETE FROM artwork_likes WHERE id = ?`,
        [existingLike.id]
      );
      await db.runQuery(
        `UPDATE artworks SET likes = MAX(likes - 1, 0) WHERE id = ?`,
        [artwork.id]
      );

      const updatedArtwork = await db.getQuery(
        `SELECT * FROM artworks WHERE id = ?`,
        [artwork.id]
      );

      return res.json({
        success: true,
        liked: false,
        likes: updatedArtwork.likes,
        message: '已取消点赞'
      });
    }

    await db.runQuery(
      `INSERT INTO artwork_likes (artwork_id, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [artwork.id, ipAddress, userAgent]
    );

    await db.runQuery(
      `UPDATE artworks SET likes = likes + 1 WHERE id = ?`,
      [artwork.id]
    );

    const updatedArtwork = await db.getQuery(
      `SELECT * FROM artworks WHERE id = ?`,
      [artwork.id]
    );

    res.json({
      success: true,
      liked: true,
      likes: updatedArtwork.likes,
      message: '点赞成功'
    });

  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const checkLikeStatus = async (req, res) => {
  try {
    const { uuid } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';

    const artwork = await db.getQuery(
      `SELECT id, likes FROM artworks WHERE uuid = ?`,
      [uuid]
    );

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: '作品不存在'
      });
    }

    const existingLike = await db.getQuery(
      `SELECT * FROM artwork_likes 
       WHERE artwork_id = ? AND ip_address = ? AND user_agent = ?`,
      [artwork.id, ipAddress, userAgent]
    );

    res.json({
      success: true,
      liked: !!existingLike,
      likes: artwork.likes
    });

  } catch (error) {
    console.error('检查点赞状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getGallery,
  getGalleryItem,
  likeArtwork,
  checkLikeStatus
};
