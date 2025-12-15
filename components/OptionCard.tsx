import React from 'react';
import { MarkdownText } from './MarkdownText';

interface OptionCardProps {
  label: string;
  text: string;
  selected: boolean;
  state: 'idle' | 'correct' | 'incorrect';
  disabled: boolean;
  onClick: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({ 
  label, 
  text, 
  selected, 
  state, 
  disabled, 
  onClick 
}) => {
  
  let styles = "bg-white border-2 border-gray-100 hover:border-indigo-200";
  let badgeStyles = "bg-gray-100 text-gray-500";

  if (state === 'correct') {
    styles = "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500";
    badgeStyles = "bg-emerald-200 text-emerald-800";
  } else if (state === 'incorrect' && selected) {
    styles = "bg-red-50 border-red-500 ring-1 ring-red-500";
    badgeStyles = "bg-red-200 text-red-800";
  } else if (selected && state === 'idle') {
    // Should not happen in immediate feedback mode, but good for generic state
    styles = "bg-indigo-50 border-primary";
    badgeStyles = "bg-indigo-200 text-indigo-800";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl mb-3 flex items-start gap-3 transition-all duration-200
        ${styles}
        ${disabled ? '' : 'hover:shadow-md active:scale-[0.99]'}
      `}
    >
      <span className={`
        flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
        ${badgeStyles}
      `}>
        {label}
      </span>
      <div className="flex-1">
         <MarkdownText content={text} className="text-sm md:text-base" />
      </div>
    </button>
  );
};