import { jsPDF } from 'jspdf';

// Geração de PDF no próprio navegador.
//
// O relatório é desenhado com texto de verdade, não como print da tela:
// o resultado é selecionável, pesquisável, leve (poucos KB) e imprime bem
// em qualquer tamanho de papel. Uma captura de imagem perderia tudo isso.
//
// Também não depende do servidor: o cidadão baixa o comprovante mesmo se a
// API estiver fora do ar, desde que a página já esteja carregada.

const MARGEM = 18;
const LARGURA = 210; // A4 retrato, em milímetros
const UTIL = LARGURA - MARGEM * 2;

const LARANJA = [229, 111, 0];
const TINTA = [31, 41, 51];
const CINZA = [91, 103, 112];

const hoje = () =>
  new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/**
 * Monta um relatório com a identidade da plataforma.
 *
 * Devolve um objeto com métodos encadeáveis para escrever o conteúdo e,
 * no fim, `salvar(nome)` — que dispara o download.
 */
export function novoRelatorio({ titulo, subtitulo }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGEM;
  let finalizado = false;

  // Quebra a página quando o conteúdo chega perto do rodapé.
  const garantirEspaco = (altura) => {
    if (y + altura > 297 - MARGEM - 12) {
      doc.addPage();
      y = MARGEM;
    }
  };

  // ---- cabeçalho ----
  doc.setFillColor(...LARANJA);
  doc.roundedRect(MARGEM, y, 11, 11, 2, 2, 'F');
  doc.setTextColor(31, 41, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VR', MARGEM + 5.5, y + 7.4, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(...TINTA);
  doc.text('VidaReal', MARGEM + 15, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text('Plataforma GovTech de Taubaté/SP', MARGEM + 15, y + 9.6);

  y += 17;
  doc.setDrawColor(...LARANJA);
  doc.setLineWidth(0.6);
  doc.line(MARGEM, y, LARGURA - MARGEM, y);
  y += 9;

  // ---- título ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...TINTA);
  doc.text(titulo, MARGEM, y);
  y += 7;

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...CINZA);
    doc.text(doc.splitTextToSize(subtitulo, UTIL), MARGEM, y);
    y += 6;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(`Emitido em ${hoje()}`, MARGEM, y);
  y += 9;

  const api = {
    secao(texto) {
      garantirEspaco(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...TINTA);
      doc.text(texto, MARGEM, y);
      y += 5.5;
      return api;
    },

    paragrafo(texto) {
      const linhas = doc.splitTextToSize(texto, UTIL);
      garantirEspaco(linhas.length * 4.6 + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...TINTA);
      doc.text(linhas, MARGEM, y);
      y += linhas.length * 4.6 + 3;
      return api;
    },

    /** Lista rótulo/valor, com o valor alinhado à direita. */
    campos(pares) {
      doc.setFontSize(9.5);
      pares.forEach(([rotulo, valor]) => {
        garantirEspaco(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...CINZA);
        doc.text(String(rotulo), MARGEM, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TINTA);
        doc.text(String(valor), LARGURA - MARGEM, y, { align: 'right' });
        y += 5.4;
        doc.setDrawColor(230, 224, 216);
        doc.setLineWidth(0.15);
        doc.line(MARGEM, y - 1.8, LARGURA - MARGEM, y - 1.8);
      });
      y += 4;
      return api;
    },

    /**
     * Tabela simples. `alinhamentos` aceita 'left' ou 'right' por coluna —
     * números só se comparam bem alinhados à direita.
     *
     * Quando a tabela não cabe no que sobrou da página, ela continua na
     * próxima COM O CABEÇALHO REPETIDO: uma coluna de números sem título
     * na página seguinte é ilegível.
     */
    tabela({ colunas, linhas, larguras, alinhamentos = [] }) {
      const alturaCabecalho = 7.5;
      const alturaLinha = 6;

      const x = (indice) => MARGEM + larguras.slice(0, indice).reduce((a, b) => a + b, 0);
      const posicao = (indice) =>
        alinhamentos[indice] === 'right' ? x(indice) + larguras[indice] - 2 : x(indice) + 2;

      const desenharCabecalho = () => {
        doc.setFillColor(243, 240, 236);
        doc.rect(MARGEM, y, UTIL, alturaCabecalho, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...TINTA);
        colunas.forEach((coluna, i) => {
          doc.text(String(coluna), posicao(i), y + 5, { align: alinhamentos[i] ?? 'left' });
        });
        y += alturaCabecalho;
      };

      // Espaço para o cabeçalho e ao menos uma linha; o resto flui.
      garantirEspaco(alturaCabecalho + alturaLinha);
      desenharCabecalho();

      linhas.forEach((linha) => {
        const antes = y;
        garantirEspaco(alturaLinha);
        // Se garantirEspaco virou a página, o cabeçalho volta no topo.
        if (y < antes) {
          desenharCabecalho();
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...TINTA);
        linha.forEach((celula, i) => {
          doc.text(String(celula), posicao(i), y + 4.2, { align: alinhamentos[i] ?? 'left' });
        });
        y += alturaLinha;
        doc.setDrawColor(235, 230, 223);
        doc.setLineWidth(0.15);
        doc.line(MARGEM, y - 1.5, LARGURA - MARGEM, y - 1.5);
      });
      y += 4;
      return api;
    },

    /** Nota de rodapé do conteúdo — normalmente a citação da fonte. */
    nota(texto) {
      const linhas = doc.splitTextToSize(texto, UTIL);
      garantirEspaco(linhas.length * 4 + 4);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...CINZA);
      doc.text(linhas, MARGEM, y);
      y += linhas.length * 4 + 3;
      return api;
    },

    /** Bytes do PDF pronto — usado para conferir o arquivo fora do navegador. */
    paraBuffer() {
      api.finalizar();
      return doc.output('arraybuffer');
    },

    /**
     * Rodapé com paginação; só agora sabemos quantas páginas existem.
     * Roda uma única vez — chamar de novo escreveria o rodapé por cima.
     */
    finalizar() {
      if (finalizado) return api;
      finalizado = true;

      const total = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= total; pagina += 1) {
        doc.setPage(pagina);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...CINZA);
        doc.text('VidaReal · documento gerado pela plataforma', MARGEM, 288);
        doc.text(`Página ${pagina} de ${total}`, LARGURA - MARGEM, 288, { align: 'right' });
      }
      return api;
    },

    salvar(nomeArquivo) {
      api.finalizar();
      doc.save(nomeArquivo);
      return api;
    },
  };

  return api;
}
