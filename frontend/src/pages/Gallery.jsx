import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';

function Gallery() {
  const { showToast } = useContext(AppContext);
  const [artworks, setArtworks] = useState([]);
  const [sortBy, setSortBy] = useState('time');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [likedItems, setLikedItems] = useState(new Set());

  useEffect(() => {
    fetchArtworks();
  }, [sortBy, page]);

  const fetchArtworks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gallery?sort=${sortBy}&page=${page}&limit=12`);
      const data = await res.json();
      if (res.ok) {
        setArtworks(data.artworks);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id, e) => {
    e.stopPropagation();
    if (likedItems.has(id)) return;

    try {
      const res = await fetch(`/api/artworks/${id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLikedItems(prev => new Set(prev).add(id));
        setArtworks(prev => 
          prev.map(item => 
            item.id === id ? { ...item, likes: data.likes } : item
          )
        );
        showToast('点赞成功！', 'success');
      }
    } catch (error) {
      showToast('点赞失败', 'error');
    }
  };

  const handleCopyCode = async (cssCode, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cssCode);
      showToast('代码已复制到剪贴板', 'success');
    } catch (error) {
      showToast('复制失败', 'error');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container">
      <section className="page-section">
        <h1 className="page-title">公共画廊</h1>
        <p className="page-subtitle">
          探索社区创作的 CSS 艺术作品，按时间或热度排序浏览
        </p>

        <div className="sort-controls">
          <span className="sort-label">排序方式:</span>
          <button 
            className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`}
            onClick={() => { setSortBy('time'); setPage(1); }}
          >
            最新发布
          </button>
          <button 
            className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
            onClick={() => { setSortBy('likes'); setPage(1); }}
          >
            最受欢迎
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
              加载中...
            </p>
          </div>
        )}

        {!loading && artworks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              画廊还没有作品，快来成为第一个创作者吧！
            </p>
          </div>
        )}

        {!loading && artworks.length > 0 && (
          <>
            <div className="gallery-grid">
              {artworks.map((artwork) => (
                <GalleryItem
                  key={artwork.id}
                  artwork={artwork}
                  onLike={(e) => handleLike(artwork.id, e)}
                  onCopy={(e) => handleCopyCode(artwork.cssCode, e)}
                  formatDate={formatDate}
                  isLiked={likedItems.has(artwork.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '32px' 
              }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '8px 16px' }}
                >
                  上一页
                </button>
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '8px 16px' }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function GalleryItem({ artwork, onLike, onCopy, formatDate, isLiked }) {
  const styleId = `gallery-css-${artwork.id}`;

  useEffect(() => {
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    const scopedCss = artwork.cssCode.replace(
      /\.css-art-container/g,
      `#${styleId}-preview .css-art-container`
    );
    styleElement.textContent = scopedCss;

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [artwork.cssCode, styleId]);

  return (
    <div className="gallery-item">
      <div className="gallery-preview">
        <img src={artwork.image_url} alt="Artwork" />
        <div className="gallery-css-overlay" id={`${styleId}-preview`}>
          <div className="css-art-container"></div>
        </div>
      </div>
      <div className="gallery-info">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start' 
        }}>
          <div>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '12px', 
              marginBottom: '4px' 
            }}>
              #{artwork.id}
            </p>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '12px' 
            }}>
              {formatDate(artwork.published_at)}
            </p>
          </div>
        </div>
        <div className="gallery-stats">
          <button 
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={onLike}
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span>{artwork.likes}</span>
          </button>
          <button className="copy-btn-small" onClick={onCopy}>
            📋 复制代码
          </button>
        </div>
      </div>
    </div>
  );
}

export default Gallery;
