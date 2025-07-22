import React, { useState, useRef, useEffect } from "react";

// Mocked skill list (replace with API call if needed)
const ALL_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C#", "C++", "SQL", "HTML", "CSS", "Tailwind", "Remix", "Prisma", "GraphQL", "AWS", "Docker", "Kubernetes"
];

type SkillSelectorProps = {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
};

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  value,
  onChange,
  placeholder = "Add a skill..."
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input for suggestions
  useEffect(() => {
    const handler = setTimeout(() => {
      if (input.trim()) {
        // Simulate API call
        setSuggestions(
          ALL_SKILLS.filter(
            s =>
              s.toLowerCase().includes(input.toLowerCase()) &&
              !value.includes(s)
          ).slice(0, 8)
        );
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [input, value]);

  // Add skill (from input or suggestion)
  const addSkill = (skill: string) => {
    if (!skill.trim() || value.includes(skill)) return;
    onChange([...value, skill]);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlight(-1);
  };

  // Remove skill
  const removeSkill = (skill: string) => {
    onChange(value.filter(s => s !== skill));
  };

  // Handle keyboard navigation and selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && highlight >= 0 && highlight < suggestions.length) {
        addSkill(suggestions[highlight]);
      } else if (input.trim()) {
        addSkill(input.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlight(-1);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.parentElement?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="skill-selector">
      <div className="skill-tags">
        {value.map(skill => (
          <span className="skill-tag" key={skill}>
            {skill}
            <button
              type="button"
              className="remove-btn"
              onClick={() => removeSkill(skill)}
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="skill-input"
          onFocus={() => input && setShowSuggestions(true)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestion-list">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={i === highlight ? "highlight" : ""}
              onMouseDown={() => addSkill(s)}
              onMouseEnter={() => setHighlight(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .skill-selector { position: relative; max-width: 400px; }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; background: #fff; }
        .skill-tag { background: #e0e7ff; color: #3730a3; border-radius: 4px; padding: 2px 8px; display: flex; align-items: center; font-size: 0.95em; }
        .remove-btn { background: none; border: none; color: #6366f1; margin-left: 4px; cursor: pointer; font-size: 1.1em; }
        .skill-input { border: none; outline: none; flex: 1; min-width: 120px; font-size: 1em; padding: 4px; }
        .suggestion-list { position: absolute; left: 0; right: 0; top: 100%; z-index: 10; background: #fff; border: 1px solid #d1d5db; border-top: none; border-radius: 0 0 6px 6px; max-height: 180px; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
        .suggestion-list li { padding: 8px 12px; cursor: pointer; }
        .suggestion-list li.highlight, .suggestion-list li:hover { background: #6366f1; color: #fff; }
      `}</style>
    </div>
  );
};
