# 智卡 AI - Quiz Card

AI 驱动的知识卡片与测试生成器，基于 Next.js 和 OpenRouter。

## 功能特性

- 🤖 使用 OpenRouter API 生成智能题目
- 📝 支持多种题型：选择题、问答题、混合模式
- 📊 自动评分和反馈
- 📚 历史记录管理
- 💾 支持导入/导出 JSON 题库
- 🎨 现代化的 UI 设计

## 技术栈

- **框架**: Next.js 15
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **AI 服务**: OpenRouter API
- **图标**: Heroicons

## 开始使用

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

你可以在 [OpenRouter](https://openrouter.ai/) 获取 API Key。

### 3. 运行开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
jacky-quiz-card/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   └── openrouter/   # OpenRouter API 代理
│   ├── globals.css       # 全局样式
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 主页面
├── components/            # React 组件
│   ├── Button.tsx
│   ├── MarkdownText.tsx
│   ├── OptionCard.tsx
│   └── QuizCard.tsx
├── services/              # 服务层
│   ├── openRouterService.ts  # OpenRouter 服务
│   └── storageService.ts     # 本地存储服务
└── types.ts              # TypeScript 类型定义
```

## 使用说明

1. **生成题目**: 输入主题，选择题型，点击"开始学习"
2. **答题**: 选择题直接点击选项，问答题输入答案后提交
3. **查看反馈**: 答题后查看 AI 评分和反馈
4. **历史记录**: 查看之前的学习记录
5. **导入题库**: 支持导入 JSON 格式的题库文件

## 环境变量说明

- `OPENROUTER_API_KEY`: OpenRouter API 密钥（必需）
- `NEXT_PUBLIC_APP_URL`: 应用 URL（可选，用于 OpenRouter 的 HTTP-Referer 头）

## 许可证

MIT
