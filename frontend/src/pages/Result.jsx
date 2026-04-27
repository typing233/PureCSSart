import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Copy, Check, Share2, ArrowLeft, Loader2, AlertCircle, Eye, Heart, Code } from 'lucide-react';
import { getArtwork, publishArtwork } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Result = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const cssContainerRef = useRef(null);
  
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState('');
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
      const result = await getArtwork(uuid);
      if (result.success) {
        setArtwork(result.data);
        setPublished(result.data.is_public === 1);
        setTitle(result.data.title || '');
      } else {
        setError(result.error || '加载失败');
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

  const handlePublish = async () => {
    if (!uuid || publishing) return;
    
    setPublishing(true);
    setError('');
    
    try {
      const result = await publishArtwork(uuid, title || 'CSS Artwork');
      if (result.success) {
        setPublished(true);
        setArtwork(prev => ({ ...prev, is_public: 1 }));
      } else {
        setError(result.error || '发布失败');
      }
    } catch (err) {
      console.error('发布失败:', err);
      setError(err.response?.data?.error || err.message || '发布失败');
    } finally {
      setPublishing(false);
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

  const statsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '1rem',
  };

  const statItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
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
        <Link to="/" style={backButtonStyle}>
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={backButtonStyle}>
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            转换结果
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

          {!published ? (
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={{
                ...buttonStyle,
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--accent-primary)',
                opacity: publishing ? 0.6 : 1,
                cursor: publishing ? 'not-allowed' : 'pointer',
              }}
            >
              {publishing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              <span>{publishing ? '发布中...' : '发布到画廊'}</span>
            </button>
          ) : (
            <Link
              to="/gallery"
              style={{
                ...buttonStyle,
                backgroundColor: 'var(--success)',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <Check size={18} />
              <span>已发布</span>
            </Link>
          )}
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

      {published && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--success)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} />
            <span>作品已发布到画廊</span>
          </div>
          <Link
            to={`/gallery/${uuid}`}
            style={{
              color: 'var(--accent-primary)',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            查看画廊页面 →
          </Link>
        </div>
      )}

      <div style={compareContainerStyle} onMouseDown={handleSplitterMouseDown}>
        <div style={{
          ...paneStyle,
          left: 0,
          width: `${splitterPosition}%`,
          borderRight: 'none',
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

      <div style={statsStyle}>
        {artwork?.views !== undefined && (
          <div style={statItemStyle}>
            <Eye size={16} />
            <span>{artwork.views} 次查看</span>
          </div>
        )}
        {artwork?.likes !== undefined && (
          <div style={statItemStyle}>
            <Heart size={16} />
            <span>{artwork.likes} 个点赞</span>
          </div>
        )}
        {artwork?.created_at && (
          <div style={statItemStyle}>
            <span>创建于 {new Date(artwork.created_at).toLocaleString('zh-CN')}</span>
          </div>
        )}
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

export default Result;
