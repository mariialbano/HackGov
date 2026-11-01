// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RegistroProtocolos
 * @notice Protótipo acadêmico do HackGov: registra, em ordem, os HASHES dos
 *         eventos do ciclo de vida de um protocolo (criado, em análise,
 *         concluído), para que qualquer pessoa possa verificar depois se o
 *         estado guardado no banco de dados da API continua o mesmo.
 *
 * @dev O que NÃO fica na blockchain: CPF, nome, descrição ou qualquer dado
 *      pessoal. Só entram dois valores de 32 bytes:
 *        - idProtocoloHash: identifica o protocolo (HMAC-SHA256 do número,
 *          calculado pela API com uma chave que não sai dela);
 *        - hashEstado: SHA-256 de uma representação canônica do estado do
 *          protocolo naquele momento, calculado pela API.
 *      Os dados originais continuam no banco relacional, que segue sendo a
 *      fonte da verdade. A blockchain só permite comprovar que eles não
 *      foram alterados depois (integridade), e a data em que o registro foi
 *      feito. Um registro é imutável: não existe função de alterar ou
 *      apagar eventos.
 *
 *      Os eventos são guardados em sequência, sem proibir retrocesso de etapa:
 *      o sistema permite reabrir um protocolo concluído, e o histórico
 *      completo (inclusive a reabertura) fica visível.
 *
 *      Não há integração com a API Java nesta versão: é um protótipo
 *      testado e implantado em rede local (ver blockchain/README.md).
 */
contract RegistroProtocolos {
    /// Etapas, espelhando o enum EtapaProtocolo da API (Criada, Em análise, Concluído).
    uint8 public constant ETAPA_CRIADA = 1;
    uint8 public constant ETAPA_EM_ANALISE = 2;
    uint8 public constant ETAPA_CONCLUIDO = 3;

    /// Um evento do histórico de um protocolo. Ocupa dois slots de armazenamento.
    struct Evento {
        bytes32 hashEstado;
        uint8 etapa;
        uint64 registradoEm; // block.timestamp do bloco que incluiu o registro
        address registrador;
    }

    /// Quem implantou o contrato: troca o registrador, mas não registra eventos.
    address public dono;

    /// Conta de serviço (a API, no futuro) autorizada a registrar eventos.
    address public registrador;

    /// Total de eventos de todos os protocolos.
    uint256 public totalEventos;

    /// idProtocoloHash => histórico em ordem de registro.
    mapping(bytes32 => Evento[]) private historico;

    event EventoRegistrado(
        bytes32 indexed idProtocoloHash,
        uint256 indexed indice,
        uint8 etapa,
        bytes32 hashEstado,
        address registrador,
        uint64 registradoEm
    );

    event RegistradorAlterado(address indexed anterior, address indexed novo);

    error NaoAutorizado();
    error EnderecoInvalido();
    error HashInvalido();
    error EtapaInvalida(uint8 etapa);
    error EventoDuplicado();
    error EventoInexistente();

    modifier somenteDono() {
        if (msg.sender != dono) revert NaoAutorizado();
        _;
    }

    modifier somenteRegistrador() {
        if (msg.sender != registrador) revert NaoAutorizado();
        _;
    }

    constructor(address registradorInicial) {
        if (registradorInicial == address(0)) revert EnderecoInvalido();
        dono = msg.sender;
        registrador = registradorInicial;
        emit RegistradorAlterado(address(0), registradorInicial);
    }

    // ---------------------------------------------------------------------
    // Escrita
    // ---------------------------------------------------------------------

    /**
     * @notice Registra um evento no histórico de um protocolo.
     * @param idProtocoloHash identificador (já em hash) do protocolo.
     * @param etapa 1 = Criada, 2 = Em análise, 3 = Concluído.
     * @param hashEstado hash do estado do protocolo neste momento.
     * @return indice posição do evento no histórico do protocolo (começa em 0).
     */
    function registrar(bytes32 idProtocoloHash, uint8 etapa, bytes32 hashEstado)
        external
        somenteRegistrador
        returns (uint256 indice)
    {
        if (idProtocoloHash == bytes32(0) || hashEstado == bytes32(0)) revert HashInvalido();
        if (etapa < ETAPA_CRIADA || etapa > ETAPA_CONCLUIDO) revert EtapaInvalida(etapa);

        Evento[] storage eventos = historico[idProtocoloHash];
        uint256 quantidade = eventos.length;

        // Reenvio acidental: o mesmo evento duas vezes seguidas. Etapas
        // repetidas com estados diferentes (edição) e retrocessos (reabertura)
        // são permitidos.
        if (quantidade > 0) {
            Evento storage ultimo = eventos[quantidade - 1];
            if (ultimo.etapa == etapa && ultimo.hashEstado == hashEstado) revert EventoDuplicado();
        }

        uint64 agora = uint64(block.timestamp);
        eventos.push(Evento(hashEstado, etapa, agora, msg.sender));
        totalEventos += 1;

        emit EventoRegistrado(idProtocoloHash, quantidade, etapa, hashEstado, msg.sender, agora);
        return quantidade;
    }

    /// @notice Troca a conta autorizada a registrar. Só o dono.
    function transferirRegistrador(address novo) external somenteDono {
        if (novo == address(0)) revert EnderecoInvalido();
        emit RegistradorAlterado(registrador, novo);
        registrador = novo;
    }

    // ---------------------------------------------------------------------
    // Consulta e verificação (leitura pública, sem custo)
    // ---------------------------------------------------------------------

    /// @notice Quantos eventos o protocolo tem.
    function quantidadeEventos(bytes32 idProtocoloHash) external view returns (uint256) {
        return historico[idProtocoloHash].length;
    }

    /// @notice Evento na posição `indice` do histórico (reverte se não existir).
    function obterEvento(bytes32 idProtocoloHash, uint256 indice) external view returns (Evento memory) {
        Evento[] storage eventos = historico[idProtocoloHash];
        if (indice >= eventos.length) revert EventoInexistente();
        return eventos[indice];
    }

    /// @notice Último evento registrado (reverte se o protocolo não tem eventos).
    function ultimoEvento(bytes32 idProtocoloHash) external view returns (Evento memory) {
        Evento[] storage eventos = historico[idProtocoloHash];
        if (eventos.length == 0) revert EventoInexistente();
        return eventos[eventos.length - 1];
    }

    /**
     * @notice Confere se o evento na posição `indice` tem exatamente esta etapa
     *         e este hash de estado. É a verificação de integridade: a API
     *         (ou um auditor) recalcula o hash do estado atual no banco e
     *         compara com o que foi registrado.
     * @return true só se o evento existe e confere; false caso contrário
     *         (nunca reverte, para servir de consulta simples).
     */
    function verificar(bytes32 idProtocoloHash, uint256 indice, uint8 etapa, bytes32 hashEstado)
        external
        view
        returns (bool)
    {
        Evento[] storage eventos = historico[idProtocoloHash];
        if (indice >= eventos.length) return false;
        Evento storage e = eventos[indice];
        return e.etapa == etapa && e.hashEstado == hashEstado;
    }
}
