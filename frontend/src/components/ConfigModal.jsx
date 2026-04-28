import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';

const DEFAULT_VISION_MODEL = 'doubao-seed-1-8-lite-260215';
const DEFAULT_CODE_MODEL = 'doubao-seed-1-8-lite-260215';

function ConfigModal({ onClose }) {
  const { config, showToast, updateConfig } = useContext(AppContext);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [codeModelName, setCodeModelName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const visionModel = config.modelName === 'doubao-seed-1.8' ? DEFAULT_VISION_MODEL : config.modelName;
    const codeModel = config.codeModelName === 'doubao-seed-1.8' ? DEFAULT_CODE_MODEL : config.codeModelName;
    setModelName(visionModel);
    setCodeModelName(codeModel);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        modelName: modelName || DEFAULT_VISION_MODEL,
        codeModelName: codeModelName || DEFAULT_CODE_MODEL
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
          modelName: modelName || DEFAULT_VISION_MODEL,
          codeModelName: codeModelName || DEFAULT_CODE_MODEL
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
          <h2 className="modal-title">火山方舟 API 配置</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.hasApiKey ? '••••••••••••（已配置，留空保持不变）' : '请输入您的火山方舟 API Key'}
            />
            <p className="form-hint">
              在火山方舟控制台 → API Key管理 页面创建。首次使用必须配置，之后更新时可以留空保持原有值。
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label">视觉模型 ID（图片分析）</label>
            <input
              type="text"
              className="form-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder={`例如: ${DEFAULT_VISION_MODEL}`}
            />
            <p className="form-hint">
              <strong>重要：</strong>需要填入完整的 Model ID（包含版本号），如 <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '3px' }}>{DEFAULT_VISION_MODEL}</code>。<br/>
              模型必须支持视觉理解（图片输入）。在火山方舟控制台 → 开通管理 页面开通模型后，查看 Model ID。
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label">代码模型 ID（CSS 生成）</label>
            <input
              type="text"
              className="form-input"
              value={codeModelName}
              onChange={(e) => setCodeModelName(e.target.value)}
              placeholder={`例如: ${DEFAULT_CODE_MODEL}`}
            />
            <p className="form-hint">
              用于生成 CSS 代码的模型，可以使用同视觉模型或其他文本模型。<br/>
              推荐: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '3px' }}>{DEFAULT_CODE_MODEL}</code>
            </p>
          </div>
          
          <div className="form-group">
            <label className="form-label">⚠️ 使用前必读</label>
            <div className="form-hint" style={{ marginTop: '0', lineHeight: '1.8' }}>
              <strong>步骤：</strong><br/>
              1. 注册火山引擎账号并完成实名认证<br/>
              2. 进入 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>火山方舟控制台</a><br/>
              3. 在「API Key管理」页面创建 API Key<br/>
              4. 在「开通管理」页面开通需要的模型（如 doubao-seed-1.8 系列）<br/>
              5. 在「在线推理」页面查看开通模型的完整 Model ID（包含版本号）<br/>
              <br/>
              <strong>注意：</strong><br/>
              - 必须开通视觉模型才能进行图片分析<br/>
              - Model ID 必须包含完整版本号，如 `doubao-seed-1-8-lite-260215`<br/>
              - 新用户通常有免费额度可供测试
            </div>
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
