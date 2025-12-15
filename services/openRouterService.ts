import { Question, QuestionType, EvaluationResult } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 使用 OpenRouter 的模型，这里使用一个支持 JSON 模式的模型
// 可以使用 google/gemini-2.0-flash-exp 或其他支持 structured outputs 的模型
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  response_format?: {
    type: 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      schema: any;
      strict: boolean;
    };
  };
  temperature?: number;
}

export const generateQuestions = async (
  topic: string, 
  mode: QuestionType, 
  count: number = 5
): Promise<Question[]> => {
  try {
    let prompt = "";
    
    // Common requirements
    const baseReqs = `
        主题: "${topic}"
        数量: ${count} 题
        语言: 必须使用简体中文 (Simplified Chinese).
        难度: 中等偏上.
        格式: Markdown.
    `;

    if (mode === 'multiple-choice') {
      prompt = `
        创建一套多项选择题。
        ${baseReqs}
        要求:
        1. 提供准确的 4 个选项。
        2. 解释为什么正确答案是对的。
        请以 JSON 格式返回，格式如下：
        [
          {
            "id": "题目唯一ID",
            "type": "multiple-choice",
            "question": "题目内容（支持 Markdown）",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correctAnswerIndex": 0,
            "explanation": "解释内容（支持 Markdown）"
          }
        ]
      `;
    } else if (mode === 'open-ended') {
      prompt = `
        创建一套开放式问答题（面试题或概念题）。
        ${baseReqs}
        要求:
        1. 问题需要深度的思考，而不仅是 是/否。
        2. 提供一个"参考范文 (modelAnswer)"，即完美、简洁的回答示例。
        请以 JSON 格式返回，格式如下：
        [
          {
            "id": "题目唯一ID",
            "type": "open-ended",
            "question": "题目内容（支持 Markdown）",
            "modelAnswer": "参考回答（支持 Markdown）"
          }
        ]
      `;
    } else {
      // Mixed Mode
      prompt = `
        创建一套混合题库，包含多项选择题和开放式问答题。
        ${baseReqs}
        要求:
        1. 大约一半是多选题，一半是问答题，随机混合。
        2. 多选题必须有 4 个选项和 correctAnswerIndex。
        3. 问答题必须有 modelAnswer。
        4. 请确保 question 字段清楚地表明了题意。
        请以 JSON 格式返回，格式如下：
        [
          {
            "id": "题目唯一ID",
            "type": "multiple-choice" 或 "open-ended",
            "question": "题目内容（支持 Markdown）",
            "options": ["选项A", "选项B", "选项C", "选项D"], // 仅多选题需要
            "correctAnswerIndex": 0, // 仅多选题需要
            "explanation": "解释内容（支持 Markdown）", // 仅多选题需要
            "modelAnswer": "参考回答（支持 Markdown）" // 仅问答题需要
          }
        ]
      `;
    }

    const responseSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["multiple-choice", "open-ended"] },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            nullable: true
          },
          correctAnswerIndex: { type: "integer", nullable: true },
          explanation: { type: "string", nullable: true },
          modelAnswer: { type: "string", nullable: true }
        },
        required: ["id", "type", "question"]
      }
    };

    // 使用更通用的 JSON 模式
    const requestBody: any = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的题目生成助手。请始终以有效的 JSON 格式返回结果，不要包含任何 markdown 代码块标记或其他文本。'
        },
        {
          role: 'user',
          content: prompt + '\n\n重要：请直接返回 JSON 数组，不要使用 markdown 代码块包裹。'
        }
      ],
      temperature: 0.7
    };

    const response = await fetch('/api/openrouter/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '生成题目失败' }));
      throw new Error(error.message || '生成题目失败');
    }

    const data = await response.json();
    
    // OpenRouter 返回的数据结构可能是 { questions: [...] } 或直接是数组
    if (data.questions && Array.isArray(data.questions)) {
      return data.questions as Question[];
    } else if (Array.isArray(data)) {
      return data as Question[];
    }
    
    throw new Error("返回数据格式不正确");
  } catch (error) {
    console.error("生成题目失败:", error);
    throw error;
  }
};

export const evaluateAnswer = async (
  question: string, 
  userAnswer: string, 
  topic: string
): Promise<EvaluationResult> => {
  try {
    const prompt = `
            你是一位严格但乐于助人的导师。
            主题: ${topic}
            问题: ${question}
            用户的回答: ${userAnswer}

            任务:
            1. 根据准确性和完整性，给回答打分（0-100分）。
            2. 提供建设性的反馈意见（中文，支持 Markdown）。指出缺失或错误的地方。
            3. 提供一个"更好的回答建议"。
            
            请以 JSON 格式返回，格式如下：
            {
              "score": 85,
              "feedback": "反馈内容（支持 Markdown）",
              "betterAnswer": "更好的回答建议（支持 Markdown）"
            }
        `;

    const requestBody: any = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的评分助手。请始终以有效的 JSON 格式返回结果，不要包含任何 markdown 代码块标记或其他文本。'
        },
        {
          role: 'user',
          content: prompt + '\n\n重要：请直接返回 JSON 对象，不要使用 markdown 代码块包裹。'
        }
      ],
      temperature: 0.7
    };

    const response = await fetch('/api/openrouter/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '评估回答失败' }));
      throw new Error(error.message || '评估回答失败');
    }

    const data = await response.json();
    return data as EvaluationResult;
  } catch (error) {
    console.error("评估回答错误:", error);
    throw error;
  }
};

