package br.gov.taubate.vidareal.servico;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.gov.taubate.vidareal.erro.ApiException;

/**
 * Consumo das APIs publicas de governo usadas pela plataforma.
 *
 * <p>Todas sao consultadas <b>pelo servidor</b>, nunca pelo navegador. Tres
 * razoes: nao dependemos de o orgao publico liberar CORS, uma unica copia em
 * cache atende todos os visitantes (em vez de cada navegador consultar por
 * conta propria), e o site continua de pe quando a origem cai.</p>
 *
 * <p>Nenhuma delas exige chave de acesso ou cadastro.</p>
 */
@Service
public class DadosPublicosService {

    private static final Logger log = LoggerFactory.getLogger(DadosPublicosService.class);

    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    // Quanto tempo cada dado vale antes de valer a pena consultar de novo.
    private static final Duration VALIDADE_INDICE = Duration.ofHours(6);   // IPCA e Selic mudam devagar
    private static final Duration VALIDADE_FERIADOS = Duration.ofDays(7);  // muda uma vez por ano
    private static final Duration VALIDADE_IBGE = Duration.ofDays(1);      // censo e PIB sao anuais
    private static final Duration VALIDADE_CEP = Duration.ofDays(7);       // endereco raramente muda

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper json = new ObjectMapper();
    private final CachePublico cache = new CachePublico();

    // ------------------------------------------------------------------
    // Banco Central - Sistema Gerenciador de Series Temporais (SGS)
    // ------------------------------------------------------------------

    private static final String SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.%d/dados/ultimos/%d?formato=json";
    private static final int SERIE_IPCA = 433;   // IPCA - variacao mensal (%)
    private static final int SERIE_SELIC = 432;  // Selic - meta anual (%)

    /**
     * IPCA acumulado nos ultimos 12 meses.
     *
     * <p>O Banco Central publica a variacao <i>de cada mes</i>. Somar os doze
     * valores daria um numero errado: inflacao e composta, entao os meses se
     * multiplicam. Um mes de 1% seguido de outro de 1% resulta em 2,01% e nao
     * em 2%.</p>
     */
    public Map<String, Object> ipca() {
        return cache.obter("ipca", VALIDADE_INDICE, () -> {
            JsonNode serie = buscarJson(String.format(SGS, SERIE_IPCA, 12), "Banco Central");

            BigDecimal fator = BigDecimal.ONE;
            List<Map<String, Object>> meses = new ArrayList<>();

            for (JsonNode ponto : serie) {
                BigDecimal variacao = new BigDecimal(ponto.get("valor").asText());
                fator = fator.multiply(BigDecimal.ONE.add(variacao.movePointLeft(2)));
                meses.add(Map.of(
                        "mes", ponto.get("data").asText(),
                        "variacao", variacao));
            }

            BigDecimal acumulado = fator.subtract(BigDecimal.ONE)
                    .movePointRight(2)
                    .setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("acumulado12Meses", acumulado);
            resposta.put("meses", meses);
            resposta.put("fonte", "Banco Central do Brasil - serie 433 (IPCA)");
            resposta.put("referencia", meses.isEmpty() ? null : meses.get(meses.size() - 1).get("mes"));
            return resposta;
        });
    }

    /** Meta da taxa Selic definida pelo Copom, em porcentagem ao ano. */
    public Map<String, Object> selic() {
        return cache.obter("selic", VALIDADE_INDICE, () -> {
            JsonNode serie = buscarJson(String.format(SGS, SERIE_SELIC, 1), "Banco Central");
            if (serie.isEmpty()) {
                throw new IllegalStateException("Serie da Selic voltou vazia.");
            }
            JsonNode ponto = serie.get(0);

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("aoAno", new BigDecimal(ponto.get("valor").asText()));
            resposta.put("referencia", ponto.get("data").asText());
            resposta.put("fonte", "Banco Central do Brasil - serie 432 (meta Selic)");
            return resposta;
        });
    }

    // ------------------------------------------------------------------
    // BrasilAPI - feriados nacionais
    // ------------------------------------------------------------------

    /**
     * Feriados nacionais do ano, usados para contar prazo em dias uteis.
     *
     * <p>Antes disso, o prazo do protocolo era o texto fixo "15 dias uteis".
     * Com os feriados reais e possivel dizer a data em que o prazo vence.</p>
     */
    public Map<String, Object> feriados(int ano) {
        List<Map<String, String>> lista = feriadosDoAno(ano);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("ano", ano);
        resposta.put("feriados", lista);
        resposta.put("fonte", "BrasilAPI - feriados nacionais");
        return resposta;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> feriadosDoAno(int ano) {
        return cache.obter("feriados-" + ano, VALIDADE_FERIADOS, () -> {
            JsonNode raiz = buscarJson("https://brasilapi.com.br/api/feriados/v1/" + ano, "BrasilAPI");
            List<Map<String, String>> lista = new ArrayList<>();
            for (JsonNode f : raiz) {
                lista.add(Map.of(
                        "data", f.get("date").asText(),
                        "nome", f.get("name").asText()));
            }
            return lista;
        });
    }

    /**
     * Soma dias uteis a uma data, pulando fins de semana e feriados nacionais.
     *
     * <p>E o calculo que transforma "prazo de 15 dias uteis" em uma data
     * concreta na tela do cidadao.</p>
     */
    public Map<String, Object> prazoEmDiasUteis(LocalDate inicio, int diasUteis) {
        Set<String> feriados = feriadosDoAno(inicio.getYear()).stream()
                .map(f -> f.get("data"))
                .collect(Collectors.toSet());

        // O prazo pode atravessar a virada do ano.
        feriados.addAll(feriadosDoAno(inicio.getYear() + 1).stream()
                .map(f -> f.get("data"))
                .collect(Collectors.toSet()));

        LocalDate data = inicio;
        int contados = 0;
        while (contados < diasUteis) {
            data = data.plusDays(1);
            boolean fimDeSemana = data.getDayOfWeek() == DayOfWeek.SATURDAY
                    || data.getDayOfWeek() == DayOfWeek.SUNDAY;
            if (!fimDeSemana && !feriados.contains(data.toString())) {
                contados++;
            }
        }

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("inicio", inicio.toString());
        resposta.put("diasUteis", diasUteis);
        resposta.put("vencimento", data.toString());
        resposta.put("fonte", "BrasilAPI - feriados nacionais");
        return resposta;
    }

    // ------------------------------------------------------------------
    // IBGE - localidades e agregados (SIDRA)
    // ------------------------------------------------------------------

    private static final String IBGE_ESTADOS =
            "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome";

    private static final String IBGE_LOCALIDADES =
            "https://servicodados.ibge.gov.br/api/v1/localidades/estados/%s/municipios";

    /**
     * As 27 unidades da federacao.
     *
     * <p>Existe para a tela pedir primeiro o estado e so depois os municipios:
     * a lista nacional tem mais de 5.500 cidades, o que torna um seletor unico
     * impraticavel.</p>
     */
    public Map<String, Object> estados() {
        return cache.obter("estados", VALIDADE_IBGE, () -> {
            JsonNode raiz = buscarJson(IBGE_ESTADOS, "IBGE");
            List<Map<String, Object>> lista = new ArrayList<>();
            for (JsonNode e : raiz) {
                lista.add(Map.of(
                        "sigla", e.get("sigla").asText(),
                        "nome", e.get("nome").asText(),
                        "regiao", e.path("regiao").path("nome").asText("")));
            }

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("estados", lista);
            resposta.put("fonte", "IBGE - API de Localidades");
            return resposta;
        });
    }

    /** Municipios de uma UF, para o seletor de comparacao. */
    public Map<String, Object> municipios(String uf) {
        String sigla = uf == null ? "SP" : uf.trim().toUpperCase();
        if (!sigla.matches("[A-Z]{2}")) {
            throw ApiException.requisicaoInvalida("Informe a UF com duas letras, por exemplo SP.", List.of());
        }

        return cache.obter("municipios-" + sigla, VALIDADE_IBGE, () -> {
            JsonNode raiz = buscarJson(String.format(IBGE_LOCALIDADES, sigla), "IBGE");
            List<Map<String, Object>> lista = new ArrayList<>();
            for (JsonNode m : raiz) {
                lista.add(Map.of(
                        "id", m.get("id").asLong(),
                        "nome", m.get("nome").asText()));
            }
            lista.sort((a, b) -> ((String) a.get("nome")).compareToIgnoreCase((String) b.get("nome")));

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("uf", sigla);
            resposta.put("municipios", lista);
            resposta.put("fonte", "IBGE - API de Localidades");
            return resposta;
        });
    }

    private static final String SIDRA =
            "https://servicodados.ibge.gov.br/api/v3/agregados/%d/periodos/%s/variaveis/%d?localidades=N6%%5B%s%%5D";
    private static final int AGREGADO_POPULACAO = 6579;  // Estimativas de Populacao
    private static final int VARIAVEL_POPULACAO = 9324;
    private static final int AGREGADO_PIB = 5938;        // PIB dos municipios
    private static final int VARIAVEL_PIB = 37;

    /**
     * Indicadores reais de um municipio: populacao estimada e PIB.
     *
     * <p>Cada indicador vem com o ano de referencia porque as pesquisas do
     * IBGE nao andam juntas — a estimativa de populacao e mais recente que o
     * PIB municipal. Omitir o ano faria o numero parecer mais atual do que e.</p>
     */
    public Map<String, Object> indicadoresMunicipio(String idIbge) {
        if (idIbge == null || !idIbge.matches("\\d{7}")) {
            throw ApiException.requisicaoInvalida(
                    "Informe o codigo IBGE do municipio (7 digitos).", List.of());
        }

        return cache.obter("municipio-" + idIbge, VALIDADE_IBGE, () -> {
            Map<String, Object> populacao = serieSidra(AGREGADO_POPULACAO, VARIAVEL_POPULACAO, idIbge);
            Map<String, Object> pib = serieSidra(AGREGADO_PIB, VARIAVEL_PIB, idIbge);

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("id", idIbge);
            resposta.put("municipio", populacao.getOrDefault("localidade", pib.get("localidade")));
            resposta.put("populacao", populacao.get("valor"));
            resposta.put("populacaoAno", populacao.get("ano"));
            // O PIB vem em mil reais na fonte; convertemos para reais.
            Object pibBruto = pib.get("valor");
            resposta.put("pibReais", pibBruto instanceof Number n
                    ? BigDecimal.valueOf(n.longValue()).multiply(BigDecimal.valueOf(1000))
                    : null);
            resposta.put("pibAno", pib.get("ano"));

            // PIB por habitante nao pode dividir o PIB de 2023 pela populacao
            // de 2026: daria um valor que nunca existiu. O certo e usar a
            // populacao do ano do PIB — mas o IBGE nao publica estimativa em
            // ano de Censo (2022 e 2023 nao existem na serie). Entao buscamos
            // o ano mais proximo e informamos qual foi, para o numero
            // continuar auditavel.
            if (pibBruto instanceof Number pibN && pib.get("ano") instanceof Integer anoPib) {
                for (int distancia = 0; distancia <= 2; distancia++) {
                    Integer anoUsado = anoComPopulacao(idIbge, anoPib, distancia);
                    if (anoUsado == null) {
                        continue;
                    }
                    Map<String, Object> pop =
                            serieSidraNoAno(AGREGADO_POPULACAO, VARIAVEL_POPULACAO, idIbge, anoUsado);
                    if (pop.get("valor") instanceof Number popN && popN.longValue() > 0) {
                        BigDecimal porHabitante = BigDecimal.valueOf(pibN.longValue())
                                .multiply(BigDecimal.valueOf(1000))
                                .divide(BigDecimal.valueOf(popN.longValue()), new MathContext(10))
                                .setScale(2, RoundingMode.HALF_UP);
                        resposta.put("pibPorHabitante", porHabitante);
                        resposta.put("pibPorHabitanteAno", anoPib);
                        resposta.put("pibPorHabitantePopulacaoAno", anoUsado);
                        break;
                    }
                }
            }

            // Coordenadas para centralizar o mapa na cidade escolhida.
            Object nome = resposta.get("municipio");
            if (nome instanceof String texto) {
                double[] ponto = coordenadas(texto);
                if (ponto != null) {
                    resposta.put("latitude", ponto[0]);
                    resposta.put("longitude", ponto[1]);
                }
            }

            resposta.put("fonte", "IBGE - SIDRA (tabelas 6579 e 5938)");
            return resposta;
        });
    }

    /**
     * Latitude e longitude de um municipio, pelo Nominatim (OpenStreetMap).
     *
     * <p>O IBGE devolve o nome como "Taubate (SP)". Separamos cidade e UF
     * para consultar a base cartografica aberta &mdash; a mesma que ja
     * desenha o mapa, entao nao entra fornecedor novo no projeto.</p>
     *
     * <p>Devolve {@code null} em qualquer falha: sem coordenada o mapa
     * simplesmente nao centraliza, e o resto da tela continua util.</p>
     */
    private double[] coordenadas(String nomeComUf) {
        // Sem regex de proposito: separar por parenteses e mais direto de ler
        // e nao depende de escapes, que aqui seriam duplos.
        int abre = nomeComUf.lastIndexOf('(');
        int fecha = nomeComUf.lastIndexOf(')');
        if (abre < 1 || fecha != nomeComUf.length() - 1 || fecha - abre != 3) {
            return null;
        }
        String cidade = nomeComUf.substring(0, abre).trim();
        String uf = nomeComUf.substring(abre + 1, fecha);
        if (cidade.isEmpty()) {
            return null;
        }

        try {
            String url = "https://nominatim.openstreetmap.org/search?city=" + escapar(cidade)
                    + "&state=" + escapar(uf) + "&country=Brazil&format=json&limit=1";
            JsonNode raiz = buscarJson(url, "OpenStreetMap");
            if (raiz.isEmpty()) {
                return null;
            }
            return new double[] {
                    raiz.get(0).get("lat").asDouble(),
                    raiz.get(0).get("lon").asDouble(),
            };
        } catch (RuntimeException erro) {
            log.warn("Sem coordenadas para {}: {}", nomeComUf, erro.getMessage());
            return null;
        }
    }

    // Painel "Cidades" do IBGE: reune num so lugar indicadores que vem de
    // fontes diferentes (Censo, INEP, DataSUS) ja consolidados por municipio.
    private static final String IBGE_PANORAMA =
            "https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/%s/resultados/%s";

    /** Indicadores sociais do painel, com o rotulo que aparece na tela. */
    private record IndicadorSocial(int id, String chave, String nome, String unidade, double maximo) {
    }

    private static final List<IndicadorSocial> SOCIAIS = List.of(
            new IndicadorSocial(60030, "esgoto",
                    "Esgotamento sanitário por rede", "%", 100),
            new IndicadorSocial(60042, "ideb",
                    "IDEB - anos finais do fundamental", "", 10),
            new IndicadorSocial(60045, "escolarizacao",
                    "Escolarização de 6 a 14 anos", "%", 100),
            new IndicadorSocial(60038, "salario",
                    "Salário médio mensal", "salários mínimos", 10));

    /**
     * Indicadores sociais reais de um municipio.
     *
     * <p>Substituem os valores ilustrativos que a tela usava antes. Cada um
     * vem com o <b>ano de referencia</b>, porque as pesquisas de origem tem
     * calendarios diferentes: o esgotamento e do Censo 2022, o IDEB vem do
     * INEP e o salario medio do Cadastro Central de Empresas.</p>
     */
    public Map<String, Object> indicadoresSociais(String idIbge) {
        if (idIbge == null || !idIbge.matches("\\d{7}")) {
            throw ApiException.requisicaoInvalida(
                    "Informe o codigo IBGE do municipio (7 digitos).", List.of());
        }

        return cache.obter("sociais-" + idIbge, VALIDADE_IBGE, () -> {
            // O painel usa o codigo sem o digito verificador.
            String codigoPainel = idIbge.substring(0, 6);
            // O painel separa os indicadores por "|", que nao e caractere
            // valido em URI: precisa ir codificado, senao URI.create recusa.
            String ids = SOCIAIS.stream()
                    .map(i -> String.valueOf(i.id()))
                    .collect(Collectors.joining("%7C"));

            JsonNode raiz = buscarJson(String.format(IBGE_PANORAMA, ids, codigoPainel), "IBGE");

            // A resposta vem como lista solta; indexamos pelo id do indicador.
            Map<Integer, JsonNode> porId = new LinkedHashMap<>();
            for (JsonNode item : raiz) {
                porId.put(item.path("id").asInt(), item);
            }

            List<Map<String, Object>> lista = new ArrayList<>();
            for (IndicadorSocial def : SOCIAIS) {
                Map<String, Object> saida = new LinkedHashMap<>();
                saida.put("chave", def.chave());
                saida.put("nome", def.nome());
                saida.put("unidade", def.unidade());
                saida.put("maximo", def.maximo());

                JsonNode serie = porId.getOrDefault(def.id(), null);
                JsonNode valores = serie == null
                        ? null
                        : serie.path("res").path(0).path("res");

                if (valores != null && valores.isObject() && !valores.isEmpty()) {
                    // Fica o ano mais recente da serie.
                    String ultimoAno = null;
                    for (var it = valores.fieldNames(); it.hasNext(); ) {
                        String ano = it.next();
                        if (ultimoAno == null || ano.compareTo(ultimoAno) > 0) {
                            ultimoAno = ano;
                        }
                    }
                    String bruto = valores.get(ultimoAno).asText("");
                    try {
                        saida.put("valor", new BigDecimal(bruto));
                        saida.put("ano", ultimoAno);
                    } catch (NumberFormatException erro) {
                        saida.put("valor", null);
                    }
                } else {
                    saida.put("valor", null);
                }

                lista.add(saida);
            }

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("id", idIbge);
            resposta.put("indicadores", lista);
            resposta.put("fonte", "IBGE - painel Cidades (Censo 2022, INEP e Cadastro Central de Empresas)");
            return resposta;
        });
    }

    // ------------------------------------------------------------------
    // OpenStreetMap - Overpass (equipamentos publicos no mapa)
    // ------------------------------------------------------------------

    private static final String OVERPASS = "https://overpass-api.de/api/interpreter";

    /** Uma categoria de ponto no mapa, com o filtro que a seleciona no OSM. */
    /**
     * Uma categoria de ponto no mapa.
     *
     * <p>Alguns equipamentos sao marcados de mais de uma forma no OSM &mdash;
     * um orgao publico pode ser {@code amenity=townhall} ou
     * {@code office=government} &mdash;, por isso a categoria carrega uma
     * <b>lista</b> de filtros.</p>
     */
    private record Categoria(String chave, String nome, List<String> filtros) {
    }

    private static final List<Categoria> CATEGORIAS = List.of(
            new Categoria("saude", "Saúde",
                    List.of("[\"amenity\"~\"^(hospital|clinic|doctors)$\"]")),
            // Creches entram junto das escolas: para o cidadao as duas
            // respondem a mesma pergunta, "onde estudam as criancas daqui".
            new Categoria("educacao", "Educação",
                    List.of("[\"amenity\"~\"^(school|kindergarten)$\"]")),
            new Categoria("farmacia", "Farmácias",
                    List.of("[\"amenity\"=\"pharmacy\"]")),
            new Categoria("bancos", "Bancos",
                    List.of("[\"amenity\"~\"^(bank|atm)$\"]")),
            new Categoria("publicos", "Órgãos públicos",
                    List.of("[\"amenity\"=\"townhall\"]", "[\"office\"=\"government\"]")),
            new Categoria("assistencia", "Assistência social",
                    List.of("[\"amenity\"=\"social_facility\"]")),
            new Categoria("lazer", "Parques",
                    List.of("[\"leisure\"=\"park\"]")),
            new Categoria("seguranca", "Segurança",
                    List.of("[\"amenity\"=\"police\"]")));

    /** Teto por categoria: um mapa com centenas de alfinetes vira mancha. */
    private static final int MAXIMO_POR_CATEGORIA = 120;

    /**
     * Equipamentos publicos do municipio, para marcar no mapa.
     *
     * <p>Vem do OpenStreetMap pela API Overpass, a mesma base que ja desenha
     * a cartografia. O OSM identifica os municipios brasileiros pelo codigo do
     * IBGE, entao a busca e exata &mdash; nao depende de casar nomes.</p>
     *
     * <p>O Overpass limita requisicoes com rigor, e por isso o resultado fica
     * um dia em cache: para o cidadao a lista de escolas de uma cidade nao
     * muda de hora em hora.</p>
     */
    public Map<String, Object> pontosDoMunicipio(String idIbge) {
        if (idIbge == null || !idIbge.matches("\\d{7}")) {
            throw ApiException.requisicaoInvalida(
                    "Informe o codigo IBGE do municipio (7 digitos).", List.of());
        }

        return cache.obter("pontos-" + idIbge, VALIDADE_IBGE, () -> {
            StringBuilder consulta = new StringBuilder("[out:json][timeout:90];");
            consulta.append("area[\"IBGE:GEOCODIGO\"=\"").append(idIbge).append("\"]->.a;(");
            for (Categoria c : CATEGORIAS) {
                for (String filtro : c.filtros()) {
                    consulta.append("nwr").append(filtro).append("(area.a);");
                }
            }
            consulta.append(");out center;");

            JsonNode raiz = postarOverpass(consulta.toString());

            // Agrupa por categoria, mantendo a ordem declarada acima.
            Map<String, List<Map<String, Object>>> porCategoria = new LinkedHashMap<>();
            CATEGORIAS.forEach(c -> porCategoria.put(c.chave(), new ArrayList<>()));

            for (JsonNode elemento : raiz.path("elements")) {
                JsonNode tags = elemento.path("tags");
                String chave = classificar(tags);
                if (chave == null) {
                    continue;
                }
                List<Map<String, Object>> lista = porCategoria.get(chave);
                if (lista.size() >= MAXIMO_POR_CATEGORIA) {
                    continue;
                }

                // Escolas e parques costumam ser areas, nao pontos: nesse caso
                // o Overpass devolve o centro em "center".
                JsonNode centro = elemento.path("center");
                double lat = centro.isMissingNode()
                        ? elemento.path("lat").asDouble(Double.NaN)
                        : centro.path("lat").asDouble(Double.NaN);
                double lon = centro.isMissingNode()
                        ? elemento.path("lon").asDouble(Double.NaN)
                        : centro.path("lon").asDouble(Double.NaN);
                if (Double.isNaN(lat) || Double.isNaN(lon)) {
                    continue;
                }

                Map<String, Object> ponto = new LinkedHashMap<>();
                ponto.put("nome", tags.path("name").asText(""));
                ponto.put("lat", lat);
                ponto.put("lon", lon);
                lista.add(ponto);
            }

            List<Map<String, Object>> categorias = new ArrayList<>();
            for (Categoria c : CATEGORIAS) {
                Map<String, Object> saida = new LinkedHashMap<>();
                saida.put("chave", c.chave());
                saida.put("nome", c.nome());
                saida.put("pontos", porCategoria.get(c.chave()));
                categorias.add(saida);
            }

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("id", idIbge);
            resposta.put("categorias", categorias);
            resposta.put("fonte", "OpenStreetMap (Overpass API) - ODbL");
            return resposta;
        });
    }

    /** Descobre a qual categoria um elemento do OSM pertence. */
    private static String classificar(JsonNode tags) {
        String amenity = tags.path("amenity").asText("");
        String leisure = tags.path("leisure").asText("");

        String office = tags.path("office").asText("");

        if (amenity.equals("hospital") || amenity.equals("clinic") || amenity.equals("doctors")) {
            return "saude";
        }
        if (amenity.equals("school") || amenity.equals("kindergarten")) {
            return "educacao";
        }
        if (amenity.equals("pharmacy")) {
            return "farmacia";
        }
        if (amenity.equals("bank") || amenity.equals("atm")) {
            return "bancos";
        }
        if (amenity.equals("townhall") || office.equals("government")) {
            return "publicos";
        }
        if (amenity.equals("social_facility")) {
            return "assistencia";
        }
        if (leisure.equals("park")) {
            return "lazer";
        }
        if (amenity.equals("police")) {
            return "seguranca";
        }
        return null;
    }

    /** O Overpass espera a consulta no corpo, como formulario. */
    private JsonNode postarOverpass(String consulta) {
        HttpRequest requisicao = HttpRequest.newBuilder()
                .uri(URI.create(OVERPASS))
                .timeout(Duration.ofSeconds(100))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "VidaReal/1.0 (projeto academico FIAP)")
                .POST(HttpRequest.BodyPublishers.ofString("data=" + escapar(consulta)))
                .build();

        try {
            HttpResponse<String> resposta = http.send(requisicao, HttpResponse.BodyHandlers.ofString());
            if (resposta.statusCode() >= 400) {
                throw new IllegalStateException("OpenStreetMap respondeu " + resposta.statusCode());
            }
            return json.readTree(resposta.body());
        } catch (IOException erro) {
            throw new IllegalStateException("Falha de rede ao consultar o OpenStreetMap: " + erro.getMessage());
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta ao OpenStreetMap interrompida.");
        }
    }

    private static final String IBGE_MALHA =
            "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/%s?formato=application/vnd.geo+json";

    /**
     * Contorno geografico do municipio, em GeoJSON.
     *
     * <p>Serve para o mapa desenhar o limite real da cidade em vez de apenas
     * cravar um alfinete no centro: o cidadao ve a extensao do territorio de
     * que os numeros falam.</p>
     */
    public JsonNode malhaMunicipio(String idIbge) {
        if (idIbge == null || !idIbge.matches("\\d{7}")) {
            throw ApiException.requisicaoInvalida(
                    "Informe o codigo IBGE do municipio (7 digitos).", List.of());
        }
        return cache.obter("malha-" + idIbge, VALIDADE_IBGE,
                () -> buscarJson(String.format(IBGE_MALHA, idIbge), "IBGE"));
    }

    /**
     * Ano candidato a distancia N do alvo: primeiro o proprio ano, depois o
     * seguinte, depois o anterior. Preferimos o ano posterior porque a
     * estimativa mais nova costuma ser a de melhor qualidade.
     */
    private Integer anoComPopulacao(String idIbge, int alvo, int distancia) {
        if (distancia == 0) {
            return alvo;
        }
        for (int candidato : new int[] { alvo + distancia, alvo - distancia }) {
            Map<String, Object> teste =
                    serieSidraNoAno(AGREGADO_POPULACAO, VARIAVEL_POPULACAO, idIbge, candidato);
            if (teste.get("valor") instanceof Number) {
                return candidato;
            }
        }
        return null;
    }

    /** Le o ultimo ponto disponivel de uma serie do SIDRA. */
    private Map<String, Object> serieSidra(int agregado, int variavel, String idIbge) {
        return lerSidra(agregado, variavel, idIbge, "-1");
    }

    /** Le o ponto de um ano especifico; volta vazio se o ano nao existir. */
    private Map<String, Object> serieSidraNoAno(int agregado, int variavel, String idIbge, int ano) {
        return lerSidra(agregado, variavel, idIbge, String.valueOf(ano));
    }

    private Map<String, Object> lerSidra(int agregado, int variavel, String idIbge, String periodo) {
        Map<String, Object> saida = new LinkedHashMap<>();
        try {
            JsonNode raiz = buscarJson(String.format(SIDRA, agregado, periodo, variavel, idIbge), "IBGE");
            JsonNode serie = raiz.path(0).path("resultados").path(0).path("series").path(0);
            saida.put("localidade", serie.path("localidade").path("nome").asText(null));

            JsonNode valores = serie.path("serie");
            valores.fieldNames().forEachRemaining(ano -> {
                String bruto = valores.get(ano).asText();
                if (bruto.matches("-?\\d+")) {
                    saida.put("ano", Integer.parseInt(ano));
                    saida.put("valor", Long.parseLong(bruto));
                }
            });
        } catch (RuntimeException erro) {
            // Um indicador indisponivel nao pode derrubar o outro.
            log.warn("SIDRA {}/{} indisponivel para {}: {}", agregado, variavel, idIbge, erro.getMessage());
        }
        return saida;
    }

    // ------------------------------------------------------------------
    // ViaCEP
    // ------------------------------------------------------------------

    /** Endereco a partir do CEP, para agilizar o cadastro do cidadao. */
    public Map<String, Object> cep(String cepBruto) {
        String cep = cepBruto == null ? "" : cepBruto.replaceAll("\\D", "");
        if (cep.length() != 8) {
            throw ApiException.requisicaoInvalida("O CEP deve ter 8 digitos.", List.of());
        }

        return cache.obter("cep-" + cep, VALIDADE_CEP, () -> {
            JsonNode raiz = buscarJson("https://viacep.com.br/ws/" + cep + "/json/", "ViaCEP");

            // O ViaCEP responde 200 com {"erro": true} quando o CEP nao existe.
            if (raiz.path("erro").asBoolean(false) || raiz.path("cep").isMissingNode()) {
                throw ApiException.naoEncontrado("CEP nao encontrado.");
            }

            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("cep", raiz.path("cep").asText());
            resposta.put("logradouro", raiz.path("logradouro").asText());
            resposta.put("bairro", raiz.path("bairro").asText());
            resposta.put("cidade", raiz.path("localidade").asText());
            resposta.put("uf", raiz.path("uf").asText());
            resposta.put("idIbge", raiz.path("ibge").asText());
            resposta.put("fonte", "ViaCEP");
            return resposta;
        });
    }

    // ------------------------------------------------------------------
    // Infraestrutura
    // ------------------------------------------------------------------

    /** Uma chamada GET que devolve JSON, com timeout e erro traduzido. */
    private JsonNode buscarJson(String url, String origem) {
        HttpRequest requisicao = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(TIMEOUT)
                .header("Accept", "application/json")
                .header("User-Agent", "VidaReal/1.0 (projeto academico FIAP)")
                .GET()
                .build();

        try {
            HttpResponse<String> resposta = http.send(requisicao, HttpResponse.BodyHandlers.ofString());
            if (resposta.statusCode() >= 400) {
                throw new IllegalStateException(origem + " respondeu " + resposta.statusCode());
            }
            return json.readTree(resposta.body());
        } catch (IOException erro) {
            throw new IllegalStateException("Falha de rede ao consultar " + origem + ": " + erro.getMessage());
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Consulta a " + origem + " interrompida.");
        }
    }

    /** Traduz qualquer falha de origem externa em 503, com a fonte no texto. */
    public static ApiException indisponivel(String origem) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "FONTE_INDISPONIVEL",
                "Nao foi possivel consultar " + origem + " agora. Tente novamente em alguns minutos.");
    }

    /** Utilitario de escape, usado apenas em nomes vindos do cliente. */
    static String escapar(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }
}
