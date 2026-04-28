import { useState, useRef, useContext } from 'react';
import { AppContext } from '../App';
import SplitView from '../components/SplitView';

function Home() {
  const { showToast, config } = useContext(AppContext);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    setImageFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleConvert = async () => {
    if (!imageFile) {
      showToast('请先上传图片', 'error');
      return;
    }

    if (!config.hasApiKey) {
      showToast('请先配置 API Key', 'error');
      return;
    }

    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '转换失败');
      }

      setResult(data);
      showToast('转换成功！', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleCopyCode = async () => {
    if (result?.cssCode) {
      try {
        await navigator.clipboard.writeText(result.cssCode);
        showToast('代码已复制到剪贴板', 'success');
      } catch (error) {
        showToast('复制失败', 'error');
      }
    }
  };

  const handlePublish = async () => {
    if (result?.artworkId) {
      try {
        const res = await fetch(`/api/artworks/${result.artworkId}/publish`, {
          method: 'POST'
        });
        if (res.ok) {
          showToast('已发布到画廊！', 'success');
        } else {
          throw new Error('发布失败');
        }
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container">
      <section className="page-section">
        <h1 className="page-title">图片转 CSS 艺术</h1>
        <p className="page-subtitle">
          上传任意图片，AI 将自动分析并生成纯 CSS 代码，无需任何图片资源
        </p>

        {!imagePreview ? (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📷</div>
            <p className="upload-text">点击或拖拽图片到此处上传</p>
            <p className="upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden-input"
              accept="image/*"
              onChange={handleInputChange}
            />
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'cover', 
                  borderRadius: '8px' 
                }} 
              />
              <div>
                <p style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {imageFile?.name}
                </p>
                <p className="upload-hint">
                  {(imageFile?.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="action-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleConvert}
                disabled={converting}
              >
                {converting ? '转换中...' : '开始转换'}
              </button>
              <button className="btn btn-outline" onClick={handleReset}>
                重新上传
              </button>
            </div>
          </div>
        )}

        {converting && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p className="loading-text">
              AI 正在分析图片并生成 CSS 代码<span className="loading-dots"></span>
            </p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: '32px' }}>
            <SplitView 
              imageUrl={result.imageUrl}
              cssCode={result.cssCode}
            />

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleCopyCode}>
                📋 复制 CSS 代码
              </button>
              <button className="btn btn-secondary" onClick={handlePublish}>
                🚀 发布到画廊
              </button>
            </div>

            <div className="code-block">
              <div className="code-header">
                <span className="code-title">生成的 CSS 代码</span>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleCopyCode}>
                  复制
                </button>
              </div>
              <div className="code-content">
                <pre>{result.cssCode}</pre>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
