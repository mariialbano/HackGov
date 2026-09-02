import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { controlClass, fieldBorder } from '../utils/formStyles';

// Campo de senha com o botão de mostrar/ocultar.
// Reunido num componente para que login, cadastro e troca de senha se
// comportem igual, inclusive no rótulo acessível do botão.
export default function CampoSenha({ id, valor, aoMudar, erro, placeholder = 'Digite sua senha', autoComplete = 'current-password' }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        maxLength={64}
        className={`${controlClass} ${fieldBorder(erro)} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-2 text-ink-500 transition-colors hover:text-ink-800"
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visivel ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        <span className="sr-only">{visivel ? 'Ocultar senha' : 'Mostrar senha'}</span>
      </button>
    </div>
  );
}
