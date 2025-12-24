import { useState, RefObject } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  position?: 'top' | 'bottom';
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  symbols: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🌈', '☀️', '🌙', '⚡', '❄️', '🎉', '🎊', '🎁', '🏆', '🥇', '🎯', '💯', '✅', '❌', '⭕', '❗', '❓', '💬', '💭', '🗨️', '👁️‍🗨️'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🦋', '🐛', '🐝', '🐞', '🦄', '🐴', '🐲', '🌸', '🌺', '🌻', '🌹'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '🍪', '🍫', '☕', '🍵', '🧃', '🍺'],
  objects: ['💻', '📱', '⌨️', '🖥️', '🖨️', '📷', '📸', '🎥', '📹', '🎬', '📺', '📻', '🎙️', '🎧', '🎤', '🎵', '🎶', '🎹', '🎸', '🎺', '🎷', '🥁', '📚', '📖', '📝', '✏️', '🖊️', '📌', '📍', '🔑', '🔒', '💡'],
  dreams: ['🌙', '⭐', '✨', '🌟', '💫', '🌌', '🔮', '🪐', '🌠', '💭', '🛏️', '😴', '💤', '🌛', '🌜', '🌝', '🌞', '☁️', '🌈', '🦋', '🧚', '🧙', '🔯', '🎭', '🪬', '🧿', '👁️', '🌀', '💜', '🔮']
};

export default function EmojiPicker({ onEmojiSelect, position = 'top', inputRef }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');

  const categoryIcons: Record<keyof typeof EMOJI_CATEGORIES, string> = {
    smileys: '😀',
    gestures: '👋',
    hearts: '❤️',
    symbols: '⭐',
    animals: '🐶',
    food: '🍎',
    objects: '💻',
    dreams: '🌙'
  };

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close panel, just focus back to input
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-pink-400 transition-colors"
        title="Emoji ekle"
      >
        <Smile size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Emoji Panel */}
          <div 
            className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-72 overflow-hidden`}
          >
            {/* Category Tabs */}
            <div className="flex gap-1 p-2 border-b border-slate-700 overflow-x-auto scrollbar-hide">
              {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    activeCategory === category 
                      ? 'bg-pink-600/20 text-pink-400' 
                      : 'hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  <span className="text-lg">{categoryIcons[category]}</span>
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1.5 text-xl hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
