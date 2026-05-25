import React from 'react';
import { TARGET_LANGUAGES } from '../constants/languages';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange, disabled }) => {
  const selected = TARGET_LANGUAGES.find((l) => l.code === value);

  return (
    <div className="flex flex-col gap-1.5 w-full font-sans">
      <label
        htmlFor="target-language-select"
        className="text-[10px] font-mono text-sub uppercase tracking-wider flex items-center gap-1.5"
      >
        <Globe className="w-3 h-3 text-primary" />
        Target Translation Engine
      </label>
      <div className="relative">
        {/* Selected language flag preview */}
        {selected && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base">
            {selected.flag}
          </div>
        )}

        <select
          id="target-language-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none w-full pl-10 pr-10 py-3 rounded-lg text-sm text-text cursor-pointer 
            transition-all focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-950/80 border border-white/[0.08]
          `}
        >
          {TARGET_LANGUAGES.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
              className="bg-surface text-text"
            >
              {lang.name} ({lang.nativeName})
            </option>
          ))}
        </select>

        {/* Custom arrow */}
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
          <ChevronDown className="w-4 h-4 text-sub" />
        </div>
      </div>
    </div>
  );
};
export default LanguageSelector;
