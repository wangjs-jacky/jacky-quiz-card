import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, EvaluationResult } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuestions = async (topic: string, mode: QuestionType, count: number = 5): Promise<Question[]> => {
  try {
    const model = "gemini-2.5-flash";
    
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
      `;
    } else if (mode === 'open-ended') {
      prompt = `
        创建一套开放式问答题（面试题或概念题）。
        ${baseReqs}
        要求:
        1. 问题需要深度的思考，而不仅是 是/否。
        2. 提供一个“参考范文 (modelAnswer)”，即完美、简洁的回答示例。
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
      `;
    }

    // Unified Schema that accommodates both types
    const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['multiple-choice', 'open-ended'] },
            question: { type: Type.STRING },
            // Optional fields depending on type
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              nullable: true
            },
            correctAnswerIndex: { type: Type.INTEGER, nullable: true },
            explanation: { type: Type.STRING, nullable: true }, // For MCQ explanation
            modelAnswer: { type: Type.STRING, nullable: true } // For Open Ended
          },
          required: ["id", "type", "question"]
        }
      };

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as Question[];
    }
    
    throw new Error("Gemini 未返回数据");

  } catch (error) {
    console.error("生成题目失败:", error);
    throw error;
  }
};

export const evaluateAnswer = async (question: string, userAnswer: string, topic: string): Promise<EvaluationResult> => {
    try {
        const model = "gemini-2.5-flash";
        const prompt = `
            你是一位严格但乐于助人的导师。
            主题: ${topic}
            问题: ${question}
            用户的回答: ${userAnswer}

            任务:
            1. 根据准确性和完整性，给回答打分（0-100分）。
            2. 提供建设性的反馈意见（中文，支持 Markdown）。指出缺失或错误的地方。
            3. 提供一个“更好的回答建议”。
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        feedback: { type: Type.STRING },
                        betterAnswer: { type: Type.STRING }
                    },
                    required: ["score", "feedback", "betterAnswer"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as EvaluationResult;
        }
        throw new Error("评估回答失败");
    } catch (error) {
        console.error("评估回答错误:", error);
        throw error;
    }
};
