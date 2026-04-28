const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DEFAULT_VISION_MODEL = 'doubao-seed-1-8-lite-260215';
const DEFAULT_CODE_MODEL = 'doubao-seed-1-8-lite-260215';
const REQUEST_TIMEOUT = 120000;

class HuoshanService {
  constructor(apiKey, modelName, codeModelName) {
    this.apiKey = apiKey;
    this.modelName = modelName || DEFAULT_VISION_MODEL;
    this.codeModelName = codeModelName || DEFAULT_CODE_MODEL;
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  }

  async fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时（${timeout / 1000}秒），请稍后重试或检查网络连接。`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async parseErrorResponse(response) {
    let errorText = '';
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorText = errorJson.error.message || JSON.stringify(errorJson.error);
      } else {
        errorText = JSON.stringify(errorJson);
      }
    } catch {
      errorText = await response.text();
    }
    return errorText;
  }

  formatError(status, errorText, modelName) {
    let userMessage = '';
    
    switch (status) {
      case 401:
        userMessage = 'API Key 无效或已过期。请检查您的火山方舟 API Key 是否正确。';
        break;
      case 403:
        userMessage = '权限不足。请检查您的火山方舟账户是否已开通该模型服务。';
        break;
      case 404:
        userMessage = `模型不存在或未开通: ${modelName}。请确认：1) 模型名称是否正确（需要包含版本号，如 ${DEFAULT_VISION_MODEL}）；2) 是否在火山方舟控制台开通了该模型服务。`;
        break;
      case 429:
        userMessage = '请求过于频繁或额度不足。请稍后重试或检查您的火山方舟账户余额。';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        userMessage = '火山方舟服务暂时不可用，请稍后重试。';
        break;
      default:
        userMessage = `API 调用失败 (${status})`;
    }

    if (errorText) {
      userMessage += `\n详细信息: ${errorText.substring(0, 500)}`;
    }

    return new Error(userMessage);
  }

  async analyzeImage(imageBase64) {
    const url = `${this.baseUrl}/chat/completions`;
    
    console.log(`[视觉分析] 使用模型: ${this.modelName}`);
    
    const payload = {
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请详细描述这张图片的内容，包括颜色、形状、布局、主要元素等。我需要用这些信息来生成纯 CSS 艺术代码。请详细描述每个元素的位置、颜色、大小和关系。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    }, 120000);

    if (!response.ok) {
      const errorText = await this.parseErrorResponse(response);
      console.error(`[视觉分析] API 错误 ${response.status}: ${errorText}`);
      throw this.formatError(response.status, errorText, this.modelName);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('[视觉分析] 响应格式异常:', JSON.stringify(result));
      throw new Error('API 响应格式异常，请稍后重试。');
    }

    return result.choices[0].message.content;
  }

  async generateCSS(imageDescription, imageDimensions) {
    const url = `${this.baseUrl}/chat/completions`;
    
    console.log(`[代码生成] 使用模型: ${this.codeModelName}`);
    
    const prompt = `根据以下图片描述，生成一个纯 CSS 艺术作品。要求：
1. 使用纯 CSS 绘制，不使用任何图片或外部资源
2. 使用 CSS Grid 或多个 div 元素配合 box-shadow、border-radius、background 等属性来绘制
3. 代码要简洁但效果要接近原图
4. 所有元素要放在一个容器 div 中，容器类名为 .css-art-container
5. 容器尺寸参考：width: ${imageDimensions.width}px, height: ${imageDimensions.height}px（可以适当调整比例）
6. 只返回 CSS 代码，不要解释，不要包括 style 标签
7. 确保所有颜色值都准确
8. 使用相对定位或绝对定位来放置元素

图片描述：
${imageDescription}

请生成对应的纯 CSS 代码：`;

    const payload = {
      model: this.codeModelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的 CSS 艺术家，擅长用纯 CSS 绘制复杂的图形和艺术作品。你只返回 CSS 代码，不解释。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    }, 120000);

    if (!response.ok) {
      const errorText = await this.parseErrorResponse(response);
      console.error(`[代码生成] API 错误 ${response.status}: ${errorText}`);
      throw this.formatError(response.status, errorText, this.codeModelName);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('[代码生成] 响应格式异常:', JSON.stringify(result));
      throw new Error('API 响应格式异常，请稍后重试。');
    }

    let cssCode = result.choices[0].message.content;
    
    cssCode = cssCode.replace(/```css\s*/g, '').replace(/```\s*$/g, '').trim();
    
    return cssCode;
  }
}

module.exports = HuoshanService;
