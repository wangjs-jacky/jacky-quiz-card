import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY 未配置' },
        { status: 500 }
      );
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Jacky Quiz Card',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API 错误:', error);
      return NextResponse.json(
        { error: 'OpenRouter API 请求失败', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 解析返回的内容
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'OpenRouter 返回数据格式不正确' },
        { status: 500 }
      );
    }

    // 清理内容，移除可能的 markdown 代码块标记
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 尝试解析 JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedContent);
    } catch (e) {
      // 如果解析失败，尝试提取 JSON 部分
      const jsonMatch = cleanedContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('JSON 解析失败:', e2, '内容:', cleanedContent.substring(0, 200));
          return NextResponse.json(
            { error: '无法解析 JSON 响应', details: String(e2) },
            { status: 500 }
          );
        }
      } else {
        console.error('无法找到 JSON 内容:', cleanedContent.substring(0, 200));
        return NextResponse.json(
          { error: '无法解析 JSON 响应' },
          { status: 500 }
        );
      }
    }

    // 如果返回的是 { questions: [...] }，提取 questions 数组
    if (parsedData && typeof parsedData === 'object' && parsedData.questions && Array.isArray(parsedData.questions)) {
      return NextResponse.json(parsedData.questions);
    }

    // 如果直接是数组，直接返回
    if (Array.isArray(parsedData)) {
      return NextResponse.json(parsedData);
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('生成题目 API 错误:', error);
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

