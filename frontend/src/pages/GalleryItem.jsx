import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Loader2, AlertCircle, Eye, Heart, Code } from 'lucide-react';
import { getGalleryItem, likeArtwork, checkLikeStatus } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const GalleryItem = () => {
  const { uuid } = useParams();
  const { isDark } = useTheme();
  const cssContainerRef = useRef(null);
  
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [liked, setLiked] = useState(false);
  const [splitterPosition, setSplitterPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadArtwork();
  }, [uuid]);

  const loadArtwork = async () => {
    if (!uuid) return;
    
    setLoading(true);
    setError('');

    try {
      const result = await getGalleryItem(uuid);
      if (result.success) {
        setArtwork(result.data);
      } else {
        setError(result.error || '加载失败');
      }

      const likeResult = await checkLikeStatus(uuid);
      if (likeResult.success) {
        setLiked(likeResult.liked);
      }
    } catch (err) {
      console.error('加载作品失败:', err);
      setError(err.response?.data?.error || err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!artwork?.cssCode) return;
    
    try {
      await navigator.clipboard.writeText(artwork.cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleLike = async () => {
    try {
      const result = await likeArtwork(uuid);
      if (result.success) {
        setLiked(result.liked);
        setArtwork(prev => prev ? { ...prev, likes: result.likes } : null);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const container = e.currentTarget;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSplitterPosition(percent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  const backButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const compareContainerStyle = {
    position: 'relative',
    display: 'flex',
    width: '100%',
    height: '500px',
    borderRadius: '1rem',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    userSelect: isDragging ? 'none' : 'auto',
  };

  const paneStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  };

  const imageStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  const splitterStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: 'var(--accent-primary)',
    cursor: 'col-resize',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const splitterHandleStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  };

  const codeContainerStyle = {
    marginTop: '1.5rem',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  };

  const codeHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
  };

  const codeContentStyle = {
    maxHeight: '300px',
    overflow: 'auto',
    padding: '1rem',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    backgroundColor: isDark ? '#0a0a12' : '#fafafa',
  };

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>加载作品中...</p>
      </div>
    );
  }

  if (error && !artwork) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <AlertCircle size={48} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
        <Link to="/gallery" style={backButtonStyle}>
          <ArrowLeft size={16} />
          <span>返回画廊</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/gallery" style={backButtonStyle}>
            <ArrowLeft size={16} />
            <span>返回画廊</span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {artwork?.title || 'CSS Artwork'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCode(!showCode)}
            style={{
              ...buttonStyle,
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            <Code size={18} />
            <span>{showCode ? '隐藏代码' : '查看代码'}</span>
          </button>

          <button
            onClick={handleCopyCode}
            style={{
              ...buttonStyle,
              backgroundColor: copied ? 'var(--success)' : 'var(--accent-primary)',
              color: 'white',
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? '已复制' : '复制代码'}</span>
          </button>

          <button
            onClick={handleLike}
            style={{
              ...buttonStyle,
              backgroundColor: 'var(--bg-secondary)',
              color: liked ? 'var(--error)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            <span>{artwork?.likes || 0}</span>
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
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '1rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Eye size={16} />
          {artwork?.views || 0} 次查看
        </span>
        {artwork?.published_at && (
          <span>
            发布于 {new Date(artwork.published_at).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      <div style={compareContainerStyle} onMouseDown={handleSplitterMouseDown}>
        <div style={{
          ...paneStyle,
          left: 0,
          width: `${splitterPosition}%`,
        }}>
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 5,
          }}>
            原图
          </div>
          {artwork?.imageUrl && (
            <img src={artwork.imageUrl} alt="原图" style={imageStyle} />
          )}
        </div>

        <div style={{
          ...paneStyle,
          right: 0,
          width: `${100 - splitterPosition}%`,
          backgroundColor: 'var(--bg-primary)',
        }}>
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 5,
          }}>
            CSS 渲染
          </div>
          <div
            ref={cssContainerRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
            dangerouslySetInnerHTML={{ __html: artwork?.cssCode || '' }}
          />
        </div>

        <div style={{ ...splitterStyle, left: `calc(${splitterPosition}% - 2px)` }}>
          <div style={splitterHandleStyle}>
            ⟷
          </div>
        </div>
      </div>

      {showCode && artwork?.cssCode && (
        <div style={codeContainerStyle} className="animate-fadeIn">
          <div style={codeHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code size={16} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>CSS 代码</span>
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: copied ? 'var(--success)' : 'var(--accent-primary)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          </div>
          <div style={codeContentStyle}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code>{artwork.cssCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryItem;
