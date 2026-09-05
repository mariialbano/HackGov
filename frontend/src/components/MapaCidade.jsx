import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, GraduationCap, HeartPulse, Cross, Trees, Shield } from 'lucide-react';
import { obterMalhaMunicipio, obterPontosMunicipio } from '../api/dadosPublicosService';

// Mapa de um município (Leaflet + camadas abertas).
//
// Nenhuma das camadas exige chave de API ou cadastro de cobrança, o que é
// coerente com uma solução GovTech construída sobre dados abertos.
//
// Além do alfinete, o mapa desenha o CONTORNO REAL do município (malha do
// IBGE): o cidadão vê a extensão do território de que os números falam, não
// só um ponto. Os valores em si ficam nos cartões acima do mapa — repeti-los
// sobre a carta seria dizer a mesma coisa duas vezes; aqui eles aparecem
// apenas no balão do alfinete, sob demanda.

// Sobre "3D": o Leaflet é um motor 2D. Relevo de verdade exigiria trocar por
// MapLibre GL com tiles vetoriais de terreno, que na prática só vêm de
// provedores com chave paga. A camada "Relevo" abaixo é a alternativa
// honesta: curvas de nível e sombreamento reais, ainda em 2D.
const CAMADAS = [
  {
    id: 'mapa',
    nome: 'Mapa',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    contorno: { color: '#e56f00', fill: '#ff8101', fillOpacity: 0.12 },
  },
  {
    id: 'satelite',
    nome: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    // Sobre imagem de satélite, laranja some: o contorno vira branco.
    contorno: { color: '#ffffff', fill: '#ffffff', fillOpacity: 0.06 },
  },
  {
    id: 'relevo',
    nome: 'Relevo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    contorno: { color: '#b3005c', fill: '#e5007d', fillOpacity: 0.1 },
  },
  {
    id: 'limpo',
    nome: 'Sem rótulos',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    atribuicao: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap',
    maxZoom: 19,
    contorno: { color: '#e56f00', fill: '#ff8101', fillOpacity: 0.16 },
  },
];

// Equipamentos públicos que podem ser marcados no mapa. A cor identifica a
// categoria e o ícone repete a informação em forma — quem não distingue as
// cores continua diferenciando os alfinetes.
const CATEGORIAS = {
  saude: { nome: 'Saúde', cor: '#cf3131', Icone: HeartPulse },
  educacao: { nome: 'Educação', cor: '#1d6fd0', Icone: GraduationCap },
  farmacia: { nome: 'Farmácias', cor: '#7b3fb8', Icone: Cross },
  lazer: { nome: 'Parques', cor: '#278553', Icone: Trees },
  seguranca: { nome: 'Segurança', cor: '#8a6d1f', Icone: Shield },
};

// Alfinete pequeno e colorido para os equipamentos, distinto do alfinete
// grande que marca o centro da cidade.
const iconePonto = (cor) =>
  L.divIcon({
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;
      background:${cor};border:2.5px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,.45)"></span>`,
  });

// Ícone em SVG: além de seguir a identidade do projeto, evita o problema
// clássico dos ícones padrão do Leaflet, cujos caminhos de imagem quebram
// quando o projeto é empacotado pelo Vite.
const icone = L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
  html: `
    <svg width="34" height="34" viewBox="0 0 24 24" fill="#f97316"
         stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,.4))">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>
      <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
    </svg>`,
});

// Mantém o mapa medindo o contêiner certo e enquadrado no município.
//
// A ordem importa: o Leaflet mede o contêiner na montagem, mas nesse
// instante ele ainda está crescendo com o layout. Se enquadrarmos antes de
// remedir, o mapa fica deslocado. Por isso invalidateSize() vem SEMPRE antes.
//
// Havendo contorno, enquadramos por ele (fitBounds) em vez de usar um zoom
// fixo: cada município tem um tamanho, e um zoom só serve mal a todos.
function AjustarEEnquadrar({ posicao, limites }) {
  const mapa = useMap();
  const jaEnquadrou = useRef(false);

  useEffect(() => {
    const enquadrar = () => {
      const caixa = mapa.getContainer().getBoundingClientRect();
      // Enquanto o contêiner não tem largura de verdade, qualquer
      // enquadramento sai deslocado. Melhor esperar o ResizeObserver.
      if (caixa.width < 1) return;

      mapa.invalidateSize();

      const animar =
        jaEnquadrou.current &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (limites) {
        mapa.fitBounds(limites, { padding: [24, 24], animate: animar });
      } else {
        mapa.setView(posicao, 12, { animate: animar });
      }
      jaEnquadrou.current = true;
    };

    const id = requestAnimationFrame(enquadrar);

    // Reenquadra a cada mudança de tamanho, não só remede: é o que conserta
    // o caso em que o mapa monta dentro de um contêiner ainda sem largura.
    const observador = new ResizeObserver(() => enquadrar());
    observador.observe(mapa.getContainer());

    return () => {
      cancelAnimationFrame(id);
      observador.disconnect();
    };
  }, [mapa, posicao, limites]);

  return null;
}

export default function MapaCidade({ cidade, indicadores = [] }) {
  const posicao = [cidade.latitude, cidade.longitude];
  const [malha, setMalha] = useState(null);
  const [camadaId, setCamadaId] = useState('mapa');

  // Equipamentos públicos. Nenhuma categoria vem ligada: o mapa abre limpo,
  // e o cidadão acende as camadas que quiser ver.
  const [pontos, setPontos] = useState(null);
  const [visiveis, setVisiveis] = useState([]);

  const camada = CAMADAS.find((c) => c.id === camadaId) ?? CAMADAS[0];

  // Contorno do município. Se falhar, o mapa continua com o alfinete.
  useEffect(() => {
    let ativo = true;
    obterMalhaMunicipio(cidade.id)
      .then((geo) => ativo && setMalha({ paraId: cidade.id, geo }))
      .catch(() => ativo && setMalha({ paraId: cidade.id, geo: null }));
    return () => {
      ativo = false;
    };
  }, [cidade.id]);

  // Os equipamentos vêm do OpenStreetMap e demoram mais que o resto: por
  // isso são buscados à parte, sem segurar o desenho do mapa.
  useEffect(() => {
    let ativo = true;
    obterPontosMunicipio(cidade.id)
      .then((d) => ativo && setPontos({ paraId: cidade.id, categorias: d.categorias }))
      .catch(() => ativo && setPontos({ paraId: cidade.id, categorias: null }));
    return () => {
      ativo = false;
    };
  }, [cidade.id]);

  const categorias = pontos?.paraId === cidade.id ? pontos.categorias : null;

  const alternarCategoria = (chave) =>
    setVisiveis((atual) =>
      atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]
    );

  const geo = malha?.paraId === cidade.id ? malha.geo : null;

  // fitBounds precisa dos limites em [[sul, oeste], [norte, leste]].
  // O GeoJSON traz [longitude, latitude] — invertido em relação ao Leaflet.
  const limites = geo ? L.geoJSON(geo).getBounds() : null;

  return (
    <div className="relative h-full">
      <MapContainer
        center={posicao}
        zoom={11}
        scrollWheelZoom
        // Zoom da roda em passos curtos. O padrão do Leaflet gasta um nível
        // inteiro a cada 60px de rolagem, e o Windows manda ~120px por
        // "clique" da roda — daí o salto de dois níveis por giro. Com 260px
        // por nível e passos de 1/4, o movimento fica gradual.
        wheelPxPerZoomLevel={260}
        zoomSnap={0.25}
        zoomDelta={0.5}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* key troca a camada de verdade em vez de só mudar a URL */}
        <TileLayer
          key={camada.id}
          attribution={camada.atribuicao}
          url={camada.url}
          maxZoom={camada.maxZoom}
        />

        <AjustarEEnquadrar posicao={posicao} limites={limites} />

        {geo && (
          <GeoJSON
            key={`${cidade.id}-${camada.id}`}
            data={geo}
            style={() => ({
              color: camada.contorno.color,
              weight: 2,
              opacity: 0.9,
              fillColor: camada.contorno.fill,
              fillOpacity: camada.contorno.fillOpacity,
            })}
          />
        )}

        {/* Equipamentos das categorias acesas */}
        {categorias
          ?.filter((c) => visiveis.includes(c.chave))
          .flatMap((c) =>
            c.pontos.map((ponto, i) => (
              <Marker
                key={`${c.chave}-${i}`}
                position={[ponto.lat, ponto.lon]}
                icon={iconePonto(CATEGORIAS[c.chave]?.cor ?? '#635a50')}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-ink-900">
                      {ponto.nome || CATEGORIAS[c.chave]?.nome}
                    </p>
                    <p className="text-ink-600">{CATEGORIAS[c.chave]?.nome}</p>
                  </div>
                </Popup>
              </Marker>
            ))
          )}

        <Marker position={posicao} icon={icone}>
          <Popup>
            <div className="text-sm">
              <p className="mb-1 font-bold text-ink-900">{cidade.municipio}</p>
              {indicadores.map((i) => (
                <p key={i.rotulo} className="text-ink-600">
                  {i.rotulo}: <strong>{i.valor}</strong>
                </p>
              ))}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Troca de camada. Botões e não um <select>: são 4 opções, e ver
          todas de uma vez é mais rápido que abrir uma lista. */}
      <div
        className="absolute right-3 top-3 z-[400] flex items-center gap-1 rounded-xl border border-ink-200 bg-surface/95 p-1 shadow-lifted backdrop-blur-sm"
        role="group"
        aria-label="Tipo de mapa"
      >
        <Layers size={14} className="ml-1.5 mr-0.5 shrink-0 text-ink-500" aria-hidden="true" />
        {CAMADAS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCamadaId(c.id)}
            aria-pressed={c.id === camadaId}
            className={[
              'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
              c.id === camadaId
                ? 'bg-brand text-on-brand'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            ].join(' ')}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {/* Camadas de equipamentos públicos. Cada botão mostra a contagem real,
          então o cidadão sabe o que vai aparecer antes de acender. */}
      {categorias && (
        <div
          className="absolute bottom-3 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-xl border border-ink-200 bg-surface/95 p-1.5 shadow-lifted backdrop-blur-sm"
          role="group"
          aria-label="Equipamentos públicos no mapa"
        >
          {categorias.map((c) => {
            const def = CATEGORIAS[c.chave];
            if (!def || c.pontos.length === 0) return null;
            const aceso = visiveis.includes(c.chave);
            const Icone = def.Icone;

            return (
              <button
                key={c.chave}
                type="button"
                onClick={() => alternarCategoria(c.chave)}
                aria-pressed={aceso}
                className={[
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  aceso ? '' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                ].join(' ')}
                // A cor da categoria é fixa nos dois temas, então a tinta
                // sobre ela também precisa ser: `text-on-fill` inverteria e
                // cairia para 2,6:1 no escuro. Branco passa em todas as
                // cinco cores (a menor é 4,58:1, em Parques).
                style={aceso ? { backgroundColor: def.cor, color: '#ffffff' } : undefined}
              >
                <Icone size={13} aria-hidden="true" />
                {def.nome}
                <span className={aceso ? 'opacity-85' : 'text-ink-500'}>{c.pontos.length}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
