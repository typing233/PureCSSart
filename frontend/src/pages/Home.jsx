import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Settings, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadAndProcessImage } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('css-art-apikey') || '');
  const [modelId, setModelId] = useState(() => localStorage.getItem('css-art-modelid') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setError('请先选择图片');
      return;
    }
    if (!apiKey.trim()) {
      setError('请输入API Key');
      setShowSettings(true);
      return;
    }
    if (!modelId.trim()) {
      setError('请输入Model ID');
      setShowSettings(true);
      return;
    }

    localStorage.setItem('css-art-apikey', apiKey.trim());
    localStorage.setItem('css-art-modelid', modelId.trim());

    setIsProcessing(true);
    setError('');
    setUploadProgress(0);

    try {
      const result = await uploadAndProcessImage(
        selectedFile,
        apiKey.trim(),
        modelId.trim(),
        (percent) => setUploadProgress(percent)
      );

      if (result.success) {
        navigate(`/result/${result.data.uuid}`);
      } else {
        setError(result.error || '处理失败，请重试');
      }
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.response?.data?.error || err.message || '处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '3rem 1.5rem',
    textAlign: 'center',
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: 800,
    marginBottom: '0.5rem',
    background: `linear-gradient(135deg, var(--accent-primary), ${isDark ? '#c084fc' : '#7c3aed'})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const subtitleStyle = {
    fontSize: '1.125rem',
    color: 'var(--text-secondary)',
    marginBottom: '2.5rem',
  };

  const dropzoneStyle = {
    border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: '1rem',
    padding: '3rem',
    backgroundColor: dragActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '1.5rem',
  };

  const previewContainerStyle = {
    position: 'relative',
    borderRadius: '1rem',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-secondary)',
    marginBottom: '1.5rem',
  };

  const previewImageStyle = {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.875rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    width: '100%',
    maxWidth: '300px',
  };

  const settingsButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '1rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const errorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--error)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  };

  const progressBarStyle = {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '1rem',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: 'var(--accent-primary)',
    transition: 'width 0.3s ease',
    width: `${uploadProgress}%`,
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>CSS Art Generator</h1>
      <p style={subtitleStyle}>上传图片，AI自动转换为纯CSS艺术代码</p>

      {error && (
        <div style={errorStyle}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!previewUrl ? (
        <div
          style={dropzoneStyle}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          <ImageIcon size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            点击或拖拽图片到这里
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            支持 JPG、PNG、GIF、WebP，最大 10MB
          </p>
        </div>
      ) : (
        <div style={previewContainerStyle}>
          <img src={previewUrl} alt="预览" style={previewImageStyle} />
          <button
            onClick={clearSelection}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            更换图片
          </button>
        </div>
      )}

      {isProcessing && (
        <div style={progressBarStyle}>
          <div style={progressFillStyle} />
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={!selectedFile || isProcessing}
        style={{
          ...buttonStyle,
          opacity: (!selectedFile || isProcessing) ? 0.6 : 1,
          cursor: (!selectedFile || isProcessing) ? 'not-allowed' : 'pointer',
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>AI处理中，请稍候...</span>
          </>
        ) : (
          <>
            <Upload size={20} />
            <span>上传并转换</span>
          </>
        )}
      </button>

      <button
        onClick={() => setShowSettings(!showSettings)}
        style={settingsButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.color = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <Settings size={16} />
        <span>AI配置</span>
      </button>

      {showSettings && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            textAlign: 'left',
          }}
          className="animate-fadeIn"
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            火山引擎 API 配置
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入火山引擎 API Key"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Model ID
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="例如: doubao-seed-2-0-lite-260215"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            配置将保存到本地浏览器。API Key 和 Model ID 需要在火山引擎控制台获取。
            <br />
            确保使用支持视觉理解的模型（如 doubao-seed 系列）。
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
