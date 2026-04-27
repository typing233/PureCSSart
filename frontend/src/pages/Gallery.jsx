import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Clock, TrendingUp, Heart, Eye, Copy, Check } from 'lucide-react';
import { getGallery, likeArtwork } from '../services/api';

const Gallery = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [likedStates, setLikedStates] = useState({});

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getGallery({ sort, page, limit: 12 });
      if (result.success) {
        setArtworks(result.data.artworks);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err) {
      console.error('加载画廊失败:', err);
      setError(err.response?.data?.error || err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handleCopyCode = async (artwork) => {
    if (!artwork.cssCode) return;
    
    try {
      await navigator.clipboard.writeText(artwork.cssCode);
      setCopiedId(artwork.uuid);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleLike = async (artwork) => {
    try {
      const result = await likeArtwork(artwork.uuid);
      if (result.success) {
        setArtworks(prev => prev.map(item => {
          if (item.uuid === artwork.uuid) {
            return { ...item, likes: result.likes };
          }
          return item;
        }));
        setLikedStates(prev => ({
          ...prev,
          [artwork.uuid]: result.liked
        }));
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const containerStyle = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1.5rem',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  };

  const cardStyle = {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--card-shadow)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
  };

  const sortButtonStyle = (isActive) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
    color: isActive ? 'white' : 'var(--text-secondary)',
  });

  const paginationStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '2rem',
  };

  const pageButtonStyle = (isActive) => ({
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
    color: isActive ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
  });

  if (loading && artworks.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>加载画廊中...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          公共画廊
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => handleSortChange('latest')}
            style={sortButtonStyle(sort === 'latest')}
          >
            <Clock size={16} />
            <span>最新</span>
          </button>
          <button
            onClick={() => handleSortChange('popular')}
            style={sortButtonStyle(sort === 'popular')}
          >
            <TrendingUp size={16} />
            <span>最热</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--error)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={loadGallery}
            style={{
              marginLeft: 'auto',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--error)',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            重试
          </button>
        </div>
      )}

      {artworks.length === 0 && !loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          <Eye size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ marginBottom: '0.5rem' }}>画廊暂无作品</p>
          <p style={{ fontSize: '0.875rem' }}>成为第一个发布作品的人吧！</p>
          <Link
            to="/"
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            开始创作
          </Link>
        </div>
      ) : (
        <div style={gridStyle}>
          {artworks.map((artwork) => (
            <div
              key={artwork.uuid}
              style={cardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--card-shadow)';
              }}
            >
              <Link to={`/gallery/${artwork.uuid}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '200px',
                  backgroundColor: 'var(--bg-secondary)',
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ __html: artwork.cssCode || '' }}
                  />
                  {artwork.imageUrl && (
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0,
                      }}
                      onError={(e) => {
                        e.target.style.opacity = 0;
                      }}
                    />
                  )}
                </div>

                <div style={{ padding: '1rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {artwork.title}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Heart size={14} />
                        {artwork.likes || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={14} />
                        {artwork.views || 0}
                      </span>
                    </div>

                    {artwork.publishedAt && (
                      <span style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                      }}>
                        {new Date(artwork.publishedAt).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              <div style={{
                padding: '0.5rem 1rem 1rem',
                display: 'flex',
                gap: '0.5rem',
              }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLike(artwork);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: likedStates[artwork.uuid] ? 'var(--error)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Heart size={14} fill={likedStates[artwork.uuid] ? 'currentColor' : 'none'} />
                  <span>点赞</span>
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopyCode(artwork);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: copiedId === artwork.uuid ? 'var(--success)' : 'var(--accent-primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedId === artwork.uuid ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedId === artwork.uuid ? '已复制' : '复制'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={paginationStyle}>
          {page > 1 && (
            <button
              onClick={() => setPage(p => p - 1)}
              style={{ ...pageButtonStyle(false), padding: '0.5rem 0.75rem' }}
            >
              上一页
            </button>
          )}

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                style={pageButtonStyle(pageNum === page)}
              >
                {pageNum}
              </button>
            );
          })}

          {page < totalPages && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ ...pageButtonStyle(false), padding: '0.5rem 0.75rem' }}
            >
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Gallery;
