import { useNavigate } from './Router';

export default function Logo() {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate('/')}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
    >
      <div className="relative overflow-visible flex items-center justify-center flex-shrink-0">
        <img 
          src="/br.png" 
          alt="Submirra Logo" 
          className="object-contain flex-shrink-0"
          style={{ width: '3.5rem', height: '3.5rem', minWidth: '3.5rem', minHeight: '3.5rem', maxWidth: '3.5rem', maxHeight: '3.5rem' }}
        />
      </div>
      <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap flex-shrink-0" style={{ fontSize: '1.125rem' }}>
        Submirra
      </span>
    </button>
  );
}
