import React from 'react';
import {
  CABECALHO_RELATORIO,
  DATALOGGERS,
  FOTOS_RELATORIO,
  ITENS_DESINSTALACAO,
  doisDigitos,
  nomeFoto,
  type LadoPosicao,
  type Relatorio,
  type Rodizio,
  type TelemetriaDatalogger,
} from '@/lib/relatorio';
import { UNIDADE_IDS, UNIDADES, type Unidade } from '@/lib/unidades';
import { formatDateBR } from '@/lib/storage';
import { descricaoPosicao, numeroBR } from './comum';

/** Quadradinho marcado com X, como no formulário impresso. */
function Marca({ ok, children }: { ok: boolean; children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <span
        aria-label={ok ? 'marcado' : 'não marcado'}
        className="mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-slate-500 text-[10px] font-bold leading-none"
      >
        {ok ? 'X' : ''}
      </span>
      {children && <span>{children}</span>}
    </span>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="font-display text-base font-semibold text-grafite">
        {numero}. {titulo}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

const celula = 'border border-slate-300 px-3 py-2 align-top';

function Item({ ok, titulo, children }: { ok: boolean; titulo: string; children: React.ReactNode }) {
  return (
    <li className="break-inside-avoid">
      <Marca ok={ok}>
        <strong className="font-semibold">{titulo}:</strong> {children}
      </Marca>
    </li>
  );
}

function Tratamento({ lado }: { lado: LadoPosicao }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Marca ok={lado.tratamento === 'T1'}>T1 (1 pé/cova)</Marca>
      <Marca ok={lado.tratamento === 'T2'}>T2 (2 pés/cova)</Marca>
    </div>
  );
}

const valor = (texto: string) => texto || '…';

function LinhaTelemetria({ chave, t }: { chave: keyof typeof DATALOGGERS; t: TelemetriaDatalogger }) {
  const info = DATALOGGERS[chave];
  return (
    <tr>
      <td className={celula}>
        <strong className="font-semibold">{info.nome}</strong>
        <br />
        <em>{info.nuvem}</em>
      </td>
      <td className={celula}>
        <div className="flex flex-col gap-0.5">
          <Marca ok={t.status === 'ok'}>OK</Marca>
          <Marca ok={t.status === 'falha'}>Falha</Marca>
        </div>
      </td>
      <td className={`${celula} tabular-nums`}>{t.tensaoMv === null ? '…' : `${numeroBR(t.tensaoMv)} mV`}</td>
      <td className={celula}>
        <div className="flex flex-col gap-0.5">
          <Marca ok={t.status !== null && !t.sinalFraco}>{info.sinal}</Marca>
          <Marca ok={t.sinalFraco}>Fraco</Marca>
        </div>
      </td>
      <td className={`${celula} tabular-nums`}>Horário: {t.primeiroPacote ? `${t.primeiroPacote} h` : '…'}</td>
    </tr>
  );
}

/**
 * Relatório no mesmo modelo do formulário em papel. Na tela fica como uma folha; na impressão
 * (ou "Salvar como PDF") sai em A4 pronto para a assinatura digital no gov.br.
 */
export function FolhaRelatorio({
  unidade,
  rodizio,
  relatorio,
  codigo,
}: {
  unidade: Unidade;
  rodizio: Rodizio;
  relatorio: Relatorio;
  codigo: string;
}) {
  const { record, origem } = rodizio;
  const d = relatorio.dados;
  const primeira = !origem;

  return (
    <article className="folha-relatorio mx-auto max-w-[210mm] rounded-[20px] bg-white px-5 py-8 text-[13px] leading-relaxed text-grafite ring-1 ring-folha-100 sm:px-12 sm:py-12 print:max-w-none print:rounded-none print:p-0 print:text-[11.5px] print:ring-0">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-300 pb-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-xl font-semibold uppercase tracking-tight text-grafite sm:text-2xl">
            {CABECALHO_RELATORIO.titulo}
          </h1>
          <p className="mt-1 text-slate-700">{CABECALHO_RELATORIO.projeto}</p>
          <p className="text-slate-700">{CABECALHO_RELATORIO.area}</p>
        </div>
        <p className="shrink-0 font-display text-lg font-semibold text-lapis tabular-nums">{codigo}</p>
      </header>

      <Secao numero={1} titulo="Identificação geral da atividade">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <th scope="row" className={`${celula} w-[44%] text-left font-semibold`}>Unidade piloto</th>
              <td className={celula}>
                <div className="flex flex-col gap-0.5">
                  {[...UNIDADE_IDS].reverse().map((id) => (
                    <Marca key={id} ok={id === unidade.id}>
                      {UNIDADES[id].rotuloRelatorio}
                    </Marca>
                  ))}
                </div>
              </td>
            </tr>
            {[
              ['Responsável técnico local', valor(d.responsavelTecnico)],
              ['Equipe de apoio / bolsistas', valor(d.equipeApoio)],
              ['Data da movimentação', formatDateBR(record.installedAt)],
              ['Horário de desconexão (célula anterior)', primeira ? '1ª instalação' : d.horaDesconexao ? `${d.horaDesconexao} h` : '…'],
              ['Horário de restabelecimento (nova célula)', d.horaRestabelecimento ? `${d.horaRestabelecimento} h` : '…'],
              ['Ciclo do rodízio', String(record.cycleNumber)],
            ].map(([rotulo, conteudo]) => (
              <tr key={rotulo}>
                <th scope="row" className={`${celula} text-left font-semibold`}>{rotulo}</th>
                <td className={`${celula} tabular-nums`}>{conteudo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao numero={2} titulo="Mapeamento da mudança de posição (metadados para IA)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className={`${celula} w-[24%] text-left font-semibold`}>Parâmetro</th>
                <th className={`${celula} text-left font-semibold`}>Posição anterior (origem)</th>
                <th className={`${celula} text-left font-semibold`}>Posição atual (destino)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${celula} text-left font-semibold`}>Identificador da posição / célula</th>
                <td className={celula}>
                  Nº {origem ? doisDigitos(origem.positionId) : '00'}
                  {origem && <span className="block text-slate-600">{descricaoPosicao(origem.positionId)}</span>}
                </td>
                <td className={celula}>
                  Nº {doisDigitos(record.positionId)}
                  <span className="block text-slate-600">{descricaoPosicao(record.positionId)}</span>
                </td>
              </tr>
              <tr>
                <th scope="row" className={`${celula} text-left font-semibold`}>Tratamento hídrico / plantio</th>
                <td className={celula}><Tratamento lado={d.origem} /></td>
                <td className={celula}><Tratamento lado={d.destino} /></td>
              </tr>
              <tr>
                <th scope="row" className={`${celula} text-left font-semibold`}>Coordenadas GPS do mastro central</th>
                {[d.origem, d.destino].map((lado, i) => (
                  <td key={i} className={`${celula} tabular-nums`}>
                    Lat: {valor(lado.latitude)}
                    <br />
                    Long: {valor(lado.longitude)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={`${celula} text-left font-semibold`}>Distância mastro → touceiras</th>
                {[d.origem, d.destino].map((lado, i) => (
                  <td key={i} className={`${celula} tabular-nums`}>
                    Raio medido: {lado.raioM === null ? '…' : `${numeroBR(lado.raioM)} m`}
                    <br />
                    <em className="text-slate-600">(Padrão: ~2,8 m)</em>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={`${celula} text-left font-semibold`}>Espécies vizinhas (SAF {unidade.nome})</th>
                <td className={celula}>{valor(d.origem.especies)}</td>
                <td className={celula}>{valor(d.destino.especies)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao numero={3} titulo="Procedimentos de desinstalação (posição de origem)">
        {primeira && <p className="mb-2 italic text-slate-600">Não se aplica: primeira instalação do ciclo.</p>}
        <ul className="space-y-1.5">
          {ITENS_DESINSTALACAO.map((item) => (
            <Item key={item.chave} ok={d.desinstalacao[item.chave]} titulo={item.titulo}>
              {item.texto}
            </Item>
          ))}
        </ul>
      </Secao>

      <Secao numero={4} titulo="Procedimentos de instalação e calibração (nova posição)">
        <h3 className="font-semibold">A. Estrutura e estação meteorológica</h3>
        <ul className="mt-1.5 space-y-1.5">
          <Item ok={d.estrutura.fixacao} titulo="Fixação mecânica">
            Conjunto prolongador acoplado e travado na haste metálica concretada.
          </Item>
          <Item ok={d.estrutura.altura} titulo="Altura regulamentar">
            Altura do ATMOS 41 Gen 2 conferida a <u>{numeroBR(d.estrutura.alturaM)} m</u> do solo.
          </Item>
          <Item ok={d.estrutura.nivelamento} titulo="Nivelamento bolha">
            Nível de bolha centralizado com ângulo de inclinação de <u>{numeroBR(d.estrutura.nivelamentoGraus)}°</u>{' '}
            (tolerância ±2°).
          </Item>
          <Item ok={d.estrutura.orientacaoNorte} titulo="Orientação azimutal">
            Sensor ATMOS 41 e painel fotovoltaico alinhados rigorosamente ao <strong>Norte Verdadeiro</strong>.
          </Item>
        </ul>

        <h3 className="mt-4 font-semibold">B. Sensores de solo</h3>
        <ul className="mt-1.5 space-y-1.5">
          <Item ok={d.solo.teros10} titulo="TEROS 10 (Umidade)">
            Inserido horizontalmente no perfil não perturbado do solo. Profundidade: <u>{numeroBR(d.solo.teros10Cm)} cm</u>.
          </Item>
          <Item ok={d.solo.teros21} titulo="TEROS 21 (Potencial Mátrico)">
            Cavidade preenchida com lama/pasta de solo nativo para eliminação de bolhas de ar antes da inserção.
            Profundidade: <u>{numeroBR(d.solo.teros21Cm)} cm</u>.
          </Item>
          <Item ok={d.solo.protecaoCabos} titulo="Proteção mecânica de cabos">
            Fiação subterrânea envelopada em eletroduto/conduíte contra enxadas e animais.
          </Item>
        </ul>

        <h3 className="mt-4 font-semibold">C. Sensores de planta</h3>
        <ul className="mt-1.5 space-y-1.5">
          <Item ok={d.planta.fylloclips} titulo="FylloClips (StremoClip)">
            Instalados em folha sadia do estrato médio. Fotodiodo apontado para o Norte e carcaça de proteção 3D ajustada.
          </Item>
          <Item ok={d.planta.radiometro} titulo="Radiômetro Infravermelho (Apogee SIL-411)">
            Montado no mastro com inclinação de <u>{numeroBR(d.planta.radiometroGraus)}°</u> e visada focada no dossel das
            plantas da célula.
          </Item>
          <li className="break-inside-avoid">
            <Marca ok={d.planta.dendrometro === 'caule'}>
              <strong className="font-semibold">Dendrômetro DD-L:</strong>
            </Marca>
            <ul className="ml-6 mt-1 space-y-1">
              <li>
                <Marca ok={d.planta.dendrometro === 'caule'}>
                  Instalado no caule (Diâmetro: <u>{numeroBR(d.planta.dendrometroDiametroCm)} cm</u>)
                </Marca>
              </li>
              <li>
                <Marca ok={d.planta.dendrometro === 'suspenso'}>Suspenso (Planta muito jovem).</Marca>
              </li>
            </ul>
          </li>
        </ul>
      </Secao>

      <Secao numero={5} titulo="Checagem de telemetria e nuvem (validação em campo)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                {['Dispositivo / nuvem', 'Status operacional', 'Tensão bateria (mV)', 'Intensidade sinal', 'Primeiro pacote na nuvem'].map(
                  (t) => (
                    <th key={t} className={`${celula} text-left font-semibold`}>
                      {t}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              <LinhaTelemetria chave="zl6" t={d.telemetria.zl6} />
              <LinhaTelemetria chave="umetos" t={d.telemetria.umetos} />
            </tbody>
          </table>
        </div>
        <p className="mt-2 italic text-slate-600">
          Confirmação de telemetria: o técnico deve abrir o aplicativo (Zentra Cloud / FieldClimate) antes de deixar o local
          para certificar que todas as portas estão plotando curvas normais.
        </p>
      </Secao>

      <Secao numero={6} titulo="Relatório fotográfico padronizado">
        <p className="italic text-slate-600">
          Fotos tiradas na luz do dia, em alta resolução e renomeadas no padrão DATA_LOCAL_POSICAO_TIPO.jpg.
        </p>
        {(['anterior', 'posterior'] as const).map((bloco) => {
          const fotos = FOTOS_RELATORIO.filter((f) => f.bloco === bloco);
          const posicao = bloco === 'anterior' ? origem?.positionId : record.positionId;
          return (
            <div key={bloco} className="mt-3 break-inside-avoid">
              <h3 className="font-semibold">
                {bloco === 'anterior'
                  ? 'Bloco 1: situação anterior (antes da desinstalação na célula de origem)'
                  : 'Bloco 2: situação posterior (instalação concluída na célula de destino)'}
              </h3>
              {bloco === 'anterior' && primeira ? (
                <p className="mt-1 italic text-slate-600">Não se aplica: primeira instalação do ciclo.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {fotos.map((f) => (
                    <li key={f.numero}>
                      <Marca ok={d.fotos[f.numero - 1]}>
                        <strong className="font-semibold">
                          Foto {doisDigitos(f.numero)} — {f.titulo}:
                        </strong>{' '}
                        {f.texto}
                        {posicao !== undefined && (
                          <span className="block break-all font-mono text-[11px] text-slate-500">
                            {nomeFoto(unidade, record.installedAt, posicao, f.tipo)}
                          </span>
                        )}
                      </Marca>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </Secao>

      <Secao numero={7} titulo="Ocorrências de campo e notas fenológicas">
        <p className="text-slate-600">
          Fatores que afetam os modelos matemáticos da IA (irrigação durante a troca, chuva recente, plantas invasoras
          roçadas, sombreamento por árvores vizinhas, pragas nas folhas monitoradas):
        </p>
        <p className="mt-2 min-h-16 whitespace-pre-line border-b border-slate-400 pb-2">{d.ocorrencias || ' '}</p>
      </Secao>

      <footer className="mt-12 break-inside-avoid">
        <p className="font-semibold">Assinatura do responsável técnico:</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm border-b border-slate-500" aria-hidden="true" />
          <p className="tabular-nums">
            <strong className="font-semibold">Data:</strong>{' '}
            {relatorio.assinadoEm ? formatDateBR(relatorio.assinadoEm) : '____ / ____ / ________'}
          </p>
        </div>
        <p className="mt-6 text-[11px] text-slate-500">
          Gerado pelo MonitorAçaí. Assinatura digital via gov.br (verificação em validar.iti.gov.br).
        </p>
      </footer>
    </article>
  );
}
