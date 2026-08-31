import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mapa interativo dos bairros de Taubaté (OpenStreetMap + Leaflet).
//
// Escolhemos OpenStreetMap em vez do Google Maps por ser uma base
// cartográfica aberta: não exige chave de API nem cadastro de cobrança,
// o que é coerente com uma solução GovTech baseada em dados abertos.

// Ícone próprio em SVG: além de combinar com a identidade visual do
// projeto, evita o problema clássico dos ícones padrão do Leaflet, cujos
// caminhos de imagem quebram quando o projeto é empacotado pelo Vite.
function criarIcone(destacado) {
  const cor = destacado ? '#f97316' : '#64748b';
  const tamanho = destacado ? 38 : 30;

  return L.divIcon({
    className: '',
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho],
    popupAnchor: [0, -tamanho],
    html: `
      <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="${cor}"
           stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>
        <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
      </svg>`,
  });
}

// Centraliza o mapa quando o usuário troca de bairro pelo seletor.
function CentralizarNoBairro({ posicao }) {
  const mapa = useMap();

  useEffect(() => {
    mapa.flyTo(posicao, 14, { duration: 0.8 });
  }, [mapa, posicao]);

  return null;
}

export default function MapaBairros({ bairros, bairroSelecionado, onSelecionarBairro }) {
  const atual = bairros.find((b) => b.nome === bairroSelecionado) ?? bairros[0];

  return (
    <MapContainer
      center={atual.coordenadas}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl z-0"
    >
      {/* Camada de mapa aberta — atribuição obrigatória pela licença do OSM */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CentralizarNoBairro posicao={atual.coordenadas} />

      {bairros.map((bairro) => {
        const destacado = bairro.nome === bairroSelecionado;
        return (
          <Marker
            key={bairro.nome}
            position={bairro.coordenadas}
            icon={criarIcone(destacado)}
            zIndexOffset={destacado ? 1000 : 0}
            eventHandlers={{ click: () => onSelecionarBairro(bairro.nome) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-gray-800 mb-1">{bairro.nome}</p>
                <p className="text-gray-600">
                  Custo de vida: <strong>R$ {bairro.custoVida.toLocaleString('pt-BR')}</strong>
                </p>
                <p className="text-gray-600">
                  Saneamento: <strong>{bairro.saneamento}%</strong>
                </p>
                <p className="text-gray-600">
                  IDEB: <strong>{bairro.ideb.toFixed(1)}</strong>
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
