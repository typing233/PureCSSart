const axios = require('axios');

const VOLCENGINE_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

const CSS_GENERATION_PROMPT = `你是一个专业的CSS艺术家和前端工程师。你的任务是将输入的图片转换成纯CSS代码实现的艺术效果。

请遵循以下规则：
1. 只能使用纯CSS（HTML元素 + CSS），不能使用JavaScript或Canvas
2. 使用HTML元素（如div、span等）配合CSS box-shadow、gradient、border等属性来绘制
3. 代码需要自包含，可以直接运行
4. 保持CSS简洁高效，尽量使用CSS变量和复用样式
5. 输出的代码应该是一个完整的HTML文件，包含style标签
6. 颜色要尽量接近原图
7. 细节要尽可能还原原图的主要特征
8. 尺寸建议：容器宽度400px左右，高度自适应

请直接输出HTML代码，不要有任何解释性文字。代码格式要正确，包含完整的<!DOCTYPE html>、<html>、<head>、<body>等标签。

请确保生成的代码是可运行的纯CSS实现，不需要任何外部资源（除了可能的渐变效果）。`;

const imageToBase64 = (buffer, mimeType) => {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

const callVolcengineAI = async (apiKey, modelId, messages, options = {}) => {
  try {
    const response = await axios.post(
      `${VOLCENGINE_BASE_URL}/chat/completions`,
      {
        model: modelId,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 8192,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    return response.data;
  } catch (error) {
    console.error('火山引擎API调用失败:', error.response?.data || error.message);
    throw new Error(`API调用失败: ${error.response?.data?.error?.message || error.message}`);
  }
};

const generateCSSFromImage = async (apiKey, modelId, imageBuffer, mimeType) => {
  const base64Image = imageToBase64(imageBuffer, mimeType);

  const messages = [
    {
      role: 'system',
      content: CSS_GENERATION_PROMPT
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请将这张图片转换成纯CSS艺术代码，输出完整的HTML文件。'
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Image,
            detail: 'high'
          }
        }
      ]
    }
  ];

  const result = await callVolcengineAI(apiKey, modelId, messages, {
    temperature: 0.6,
    max_tokens: 16384
  });

  if (!result.choices || result.choices.length === 0) {
    throw new Error('AI返回结果为空');
  }

  let cssCode = result.choices[0].message.content;
  
  cssCode = extractCodeFromResponse(cssCode);

  return {
    cssCode,
    usage: result.usage,
    model: result.model
  };
};

const extractCodeFromResponse = (content) => {
  const codeBlockMatch = content.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  const htmlTagMatch = content.match(/<html[\s\S]*<\/html>/i);
  if (htmlTagMatch) {
    return htmlTagMatch[0].trim();
  }
  
  const doctypeMatch = content.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  if (doctypeMatch) {
    return doctypeMatch[0].trim();
  }

  return content.trim();
};

const generateCSSFromDescription = async (apiKey, modelId, description) => {
  const messages = [
    {
      role: 'system',
      content: CSS_GENERATION_PROMPT
    },
    {
      role: 'user',
      content: `请根据以下描述创建CSS艺术效果：${description}。输出完整的HTML文件。`
    }
  ];

  const result = await callVolcengineAI(apiKey, modelId, messages, {
    temperature: 0.7,
    max_tokens: 16384
  });

  if (!result.choices || result.choices.length === 0) {
    throw new Error('AI返回结果为空');
  }

  let cssCode = result.choices[0].message.content;
  cssCode = extractCodeFromResponse(cssCode);

  return {
    cssCode,
    usage: result.usage,
    model: result.model
  };
};

module.exports = {
  callVolcengineAI,
  generateCSSFromImage,
  generateCSSFromDescription,
  extractCodeFromResponse,
  imageToBase64
};
