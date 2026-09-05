package br.gov.taubate.vidareal.web;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.servico.DadosPublicosService;

/**
 * Dados abertos de governo, servidos pela nossa API.
 *
 * <p>O front-end nao chama o Banco Central nem o IBGE diretamente: pede aqui.
 * Assim a plataforma controla o cache, padroniza o formato de erro e continua
 * funcionando quando a origem esta fora do ar.</p>
 *
 * <p>Sao leituras de dados publicos, entao os endpoints nao exigem login — o
 * que nao significa que sejam ilimitados: valem os mesmos limites de tamanho
 * e o mesmo tratamento de erro do resto da API.</p>
 */
@RestController
@RequestMapping("/api/v1/dados")
public class DadosPublicosController {

    private final DadosPublicosService servico;

    public DadosPublicosController(DadosPublicosService servico) {
        this.servico = servico;
    }

    /** IPCA acumulado em 12 meses (Banco Central, serie 433). */
    @GetMapping("/ipca")
    public Map<String, Object> ipca() {
        try {
            return servico.ipca();
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o Banco Central");
        }
    }

    /** Meta Selic ao ano (Banco Central, serie 432). */
    @GetMapping("/selic")
    public Map<String, Object> selic() {
        try {
            return servico.selic();
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o Banco Central");
        }
    }

    /** Feriados nacionais do ano informado (BrasilAPI). */
    @GetMapping("/feriados")
    public Map<String, Object> feriados(@RequestParam(required = false) Integer ano) {
        int alvo = ano == null ? LocalDate.now().getYear() : ano;
        if (alvo < 1900 || alvo > 2200) {
            throw ApiException.requisicaoInvalida("Informe um ano entre 1900 e 2200.", java.util.List.of());
        }
        try {
            return servico.feriados(alvo);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("a base de feriados");
        }
    }

    /**
     * Data de vencimento de um prazo contado em dias uteis.
     *
     * <p>Exemplo: {@code /prazo?dias=15} devolve quando vence um protocolo
     * aberto hoje, ja descontando fins de semana e feriados nacionais.</p>
     */
    @GetMapping("/prazo")
    public Map<String, Object> prazo(@RequestParam(defaultValue = "15") int dias,
                                     @RequestParam(required = false) String inicio) {
        if (dias < 1 || dias > 365) {
            throw ApiException.requisicaoInvalida("O prazo deve ficar entre 1 e 365 dias uteis.", java.util.List.of());
        }
        LocalDate partida;
        try {
            partida = inicio == null || inicio.isBlank() ? LocalDate.now() : LocalDate.parse(inicio);
        } catch (RuntimeException erro) {
            throw ApiException.requisicaoInvalida("A data de inicio deve estar no formato AAAA-MM-DD.", java.util.List.of());
        }
        try {
            return servico.prazoEmDiasUteis(partida, dias);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("a base de feriados");
        }
    }

    /**
     * As 27 unidades da federacao (IBGE - Localidades).
     *
     * <p>A tela pede o estado primeiro para nao apresentar um seletor com os
     * mais de 5.500 municipios do pais de uma vez.</p>
     */
    @GetMapping("/estados")
    public Map<String, Object> estados() {
        try {
            return servico.estados();
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o IBGE");
        }
    }

    /** Indicadores sociais reais do municipio (IBGE - painel Cidades). */
    @GetMapping("/municipios/{id}/sociais")
    public Map<String, Object> sociais(@PathVariable String id) {
        try {
            return servico.indicadoresSociais(id);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o IBGE");
        }
    }

    /** Equipamentos publicos para marcar no mapa (OpenStreetMap). */
    @GetMapping("/municipios/{id}/pontos")
    public Map<String, Object> pontos(@PathVariable String id) {
        try {
            return servico.pontosDoMunicipio(id);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o OpenStreetMap");
        }
    }

    /** Contorno geografico do municipio em GeoJSON (IBGE - Malhas). */
    @GetMapping("/municipios/{id}/malha")
    public com.fasterxml.jackson.databind.JsonNode malha(@PathVariable String id) {
        try {
            return servico.malhaMunicipio(id);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o IBGE");
        }
    }

    /** Municipios de uma UF (IBGE - Localidades). */
    @GetMapping("/municipios")
    public Map<String, Object> municipios(@RequestParam(defaultValue = "SP") String uf) {
        try {
            return servico.municipios(uf);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o IBGE");
        }
    }

    /** Populacao e PIB de um municipio (IBGE - SIDRA). */
    @GetMapping("/municipios/{id}")
    public Map<String, Object> municipio(@PathVariable String id) {
        try {
            return servico.indicadoresMunicipio(id);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o IBGE");
        }
    }

    /** Endereco a partir do CEP (ViaCEP). */
    @GetMapping("/cep/{cep}")
    public Map<String, Object> cep(@PathVariable String cep) {
        try {
            return servico.cep(cep);
        } catch (ApiException erro) {
            throw erro;
        } catch (RuntimeException erro) {
            throw DadosPublicosService.indisponivel("o ViaCEP");
        }
    }
}
