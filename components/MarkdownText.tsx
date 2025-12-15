import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm prose-indigo max-w-none text-gray-800 dark:text-gray-200 ${className}`}>
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return  (
              <code className={`${className} bg-gray-100 text-pink-600 rounded px-1 py-0.5 text-sm font-mono`} {...props}>
                {children}
              </code>
            )
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          ul({ children }) {
            return <ul className="list-disc ml-4 mb-2">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal ml-4 mb-2">{children}</ol>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};