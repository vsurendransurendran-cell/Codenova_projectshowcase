import React from 'react';
import { TagWithCount } from '../types.js';
import { Tag as TagIcon, X } from 'lucide-react';

interface TagFilterProps {
  tags: TagWithCount[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onToggleTag,
  onClearTags,
}) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <TagIcon className="h-3.5 w-3.5" />
          <span>Filter by Technology</span>
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
          >
            <X className="h-3 w-3" />
            <span>Reset filters ({selectedTags.length})</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {tags.map((t) => {
          const isSelected = selectedTags.includes(t.name);
          return (
            <button
              key={t.id}
              onClick={() => onToggleTag(t.name)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <span>{t.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-indigo-700/80 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
