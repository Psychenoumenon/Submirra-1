import { useNavigate } from './Router';

export default function Logo() {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate('/')}
      className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
    >
      <div className="relative w-10 h-10 overflow-visible flex items-center justify-center">
        <img 
          src="/br.png" 
          alt="Submirra Logo" 
          className="w-16 h-16 object-contain scale-150"
        />
      </div>
      <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
        Submirra
      </span>
    </button>
  );
}
