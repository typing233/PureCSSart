import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';

function ConfigModal({ onClose }) {
  const { config, showToast, updateConfig } = useContext(AppContext);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [codeModelName, setCodeModelName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setModelName(config.modelName);
    setCodeModelName(config.codeModelName);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        modelName,
        codeModelName
      };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        updateConfig({
          hasApiKey: config.hasApiKey || !!apiKey.trim(),
          modelName,
          codeModelName
        });
        showToast('配置已保存', 'success');
        onClose();
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      showToast('保存失败: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">API 配置</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">火山方舟 API Key</label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.hasApiKey ? '••••••••••••（已配置）' : '请输入您的 API Key'}
            />
            <p className="form-hint">
              在火山方舟平台获取 API Key。首次使用必须配置，之后更新时可以留空保持原有值。
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">视觉模型名称（图片分析）</label>
            <input
              type="text"
              className="form-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="例如: doubao-seed-1.8"
            />
            <p className="form-hint">
              用于分析图片内容的模型，需要支持图片输入。推荐: doubao-seed-1.8
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">代码模型名称（CSS 生成）</label>
            <input
              type="text"
              className="form-input"
              value={codeModelName}
              onChange={(e) => setCodeModelName(e.target.value)}
              placeholder="例如: doubao-seed-1.8"
            />
            <p className="form-hint">
              用于生成 CSS 代码的模型。推荐: doubao-seed-1.8
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">如何获取？</label>
            <p className="form-hint" style={{ marginTop: 0 }}>
              1. 访问火山方舟平台（https://www.volcengine.com/product/ark）<br/>
              2. 开通服务并创建端点<br/>
              3. 获取 API Key 和模型名称
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigModal;
