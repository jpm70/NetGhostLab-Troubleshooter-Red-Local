import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Binary,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Lightbulb,
  RotateCcw,
  Save,
  Sliders,
  Wrench,
} from 'lucide-react';
import {
  FaultType,
  HostHealthReport,
  HostNode,
  RouterConfig,
  Scenario,
} from '../types/network';
import {
  FAULT_LABELS,
  getBroadcastAddress,
  getNetworkAddress,
  getTotalUsableHosts,
  getUsableHostRange,
  ipToBinaryOctets,
  isSameSubnet,
  isValidIp,
  isValidMask,
  maskToCidr,
} from '../utils/networkEngine';

interface DiagnosisAndConfigPanelProps {
  scenario: Scenario;
  activeHost: HostNode;
  allHosts: HostNode[];
  router: RouterConfig;
  healthMap: Record<string, HostHealthReport>;
  onUpdateHostConfig: (
    hostId: string,
    updated: Pick<HostNode, 'ip' | 'mask' | 'gateway' | 'dns'>
  ) => void;
  onResetScenario: () => void;
  onScenarioSolved: () => void;
  isScenarioFullyRepaired: boolean;
  onExportReport: () => void;
}

const SELECTABLE_FAULTS: FaultType[] = [
  'WRONG_GATEWAY',
  'INVALID_DNS',
  'DUPLICATE_IP',
  'WRONG_SUBNET_MASK',
  'WRONG_SUBNET_IP',
];

export const DiagnosisAndConfigPanel: React.FC<
  DiagnosisAndConfigPanelProps
> = ({
  scenario,
  activeHost,
  allHosts,
  router,
  healthMap,
  onUpdateHostConfig,
  onResetScenario,
  onScenarioSolved,
  isScenarioFullyRepaired,
  onExportReport,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnose' | 'config' | 'binary'>(
    'diagnose'
  );

  // Diagnosis form state
  const [suspectedHostId, setSuspectedHostId] = useState<string>(activeHost.id);
  const [suspectedFault, setSuspectedFault] =
    useState<FaultType>('WRONG_GATEWAY');
  const [diagnosisFeedback, setDiagnosisFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  // Hints state
  const [revealedHintsCount, setRevealedHintsCount] = useState<number>(0);

  // TCP/IP Editor state synced with activeHost
  const [ipInput, setIpInput] = useState(activeHost.ip);
  const [maskInput, setMaskInput] = useState(activeHost.mask);
  const [gwInput, setGwInput] = useState(activeHost.gateway);
  const [dnsInput, setDnsInput] = useState(activeHost.dns);
  const [configSavedBanner, setConfigSavedBanner] = useState<string | null>(
    null
  );

  // Binary comparator target IP state
  const [compareIp, setCompareIp] = useState<string>(router.lanIp);

  // Reset local state when scenario changes
  useEffect(() => {
    setDiagnosisFeedback(null);
    setRevealedHintsCount(0);
    setSuspectedHostId(scenario.hosts[0]?.id || 'PC-01');
    setCompareIp(scenario.router.lanIp);
  }, [scenario.id, scenario.router.lanIp]);

  // Sync TCP/IP editor inputs when activeHost changes
  useEffect(() => {
    setIpInput(activeHost.ip);
    setMaskInput(activeHost.mask);
    setGwInput(activeHost.gateway);
    setDnsInput(activeHost.dns);
    setConfigSavedBanner(null);
  }, [
    activeHost.id,
    activeHost.ip,
    activeHost.mask,
    activeHost.gateway,
    activeHost.dns,
  ]);

  const handleVerifyDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedExpected = scenario.expectedFaults.find(
      (ef) =>
        ef.hostId === suspectedHostId && ef.faultType === suspectedFault
    );

    const duplicateMatch =
      suspectedFault === 'DUPLICATE_IP' &&
      scenario.expectedFaults.some((ef) => ef.faultType === 'DUPLICATE_IP') &&
      healthMap[suspectedHostId]?.detectedFaults.includes('DUPLICATE_IP');

    if (matchedExpected || duplicateMatch) {
      const exp =
        matchedExpected ||
        scenario.expectedFaults.find((ef) => ef.faultType === 'DUPLICATE_IP')!;
      setDiagnosisFeedback({
        correct: true,
        message: `¡Diagnóstico exacto! ${exp.explanation} Ahora puedes pasar a la pestaña «2. Propiedades TCP/IPv4» para corregir el parámetro y restablecer el servicio.`,
      });
      onScenarioSolved();
    } else {
      const hostHasSomeFault = scenario.expectedFaults.some(
        (ef) => ef.hostId === suspectedHostId
      );
      if (hostHasSomeFault) {
        setDiagnosisFeedback({
          correct: false,
          message: `Has identificado correctamente que ${suspectedHostId} presenta un problema, pero la causa raíz no es «${FAULT_LABELS[suspectedFault]}». Revisa las salidas de ping, tracert, ipconfig y nslookup.`,
        });
      } else {
        setDiagnosisFeedback({
          correct: false,
          message: `El equipo ${suspectedHostId} no es el causante de la avería descrita en el ticket. Ejecuta pruebas desde los distintos puestos para aislar el host afectado.`,
        });
      }
    }
  };

  const handleApplyTcpIp = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateHostConfig(activeHost.id, {
      ip: ipInput.trim(),
      mask: maskInput.trim(),
      gateway: gwInput.trim(),
      dns: dnsInput.trim(),
    });
    setConfigSavedBanner(
      `Parámetros TCP/IPv4 aplicados en ${activeHost.name}. Comprueba el estado de conectividad o ejecuta ping en la consola.`
    );
  };

  const previewNetValid = isValidIp(ipInput) && isValidMask(maskInput);
  const previewCidr = previewNetValid ? maskToCidr(maskInput) : 0;
  const previewNetAddr = previewNetValid
    ? getNetworkAddress(ipInput, maskInput)
    : 'Formato inválido';
  const previewBroadcast = previewNetValid
    ? getBroadcastAddress(ipInput, maskInput)
    : 'Formato inválido';
  const previewRange = previewNetValid
    ? getUsableHostRange(ipInput, maskInput)
    : 'N/A';

  // Binary calculation data
  const activeCidr = maskToCidr(activeHost.mask);
  const srcBinOctets = ipToBinaryOctets(activeHost.ip);
  const maskBinOctets = ipToBinaryOctets(activeHost.mask);
  const srcNetIp = getNetworkAddress(activeHost.ip, activeHost.mask);
  const srcNetBinOctets = ipToBinaryOctets(srcNetIp);

  const dstNetUnderSrcMask = getNetworkAddress(compareIp, activeHost.mask);
  const dstBinOctets = ipToBinaryOctets(compareIp);
  const sameSubnetResult = isSameSubnet(
    activeHost.ip,
    compareIp,
    activeHost.mask
  );

  // Renders 32 bits colored by network vs host portion
  const renderColoredBinary = (octets: string[], cidr: number) => {
    let bitCounter = 0;
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
        {octets.map((octet, oIdx) => (
          <React.Fragment key={oIdx}>
            {oIdx > 0 && <span className="text-slate-600">.</span>}
            <span>
              {octet.split('').map((bit, bIdx) => {
                bitCounter++;
                const isNetworkBit = bitCounter <= cidr;
                return (
                  <span
                    key={bIdx}
                    className={
                      isNetworkBit
                        ? 'text-sky-400 font-semibold'
                        : 'text-amber-300'
                    }
                  >
                    {bit}
                  </span>
                );
              })}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden">
      {/* Top Segmented Control Tabs */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('diagnose')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'diagnose'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>1. Diagnóstico</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. TCP/IPv4 ({activeHost.name})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('binary')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'binary'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>3. Binario</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExportReport}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Descargar informe técnico en Markdown con las pruebas realizadas"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Informe</span>
          </button>
          <button
            type="button"
            onClick={onResetScenario}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Restaurar configuración inicial del escenario"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* Global Network Repaired Celebration Banner */}
      {isScenarioFullyRepaired && (
        <div className="px-4 py-3 bg-emerald-950/50 border-b border-emerald-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="font-semibold text-emerald-300">
                ¡Red Local 100% Operativa!
              </strong>{' '}
              Todos los equipos tienen conectividad LAN, llegan al Gateway (
              {router.lanIp}) y resuelven dominios DNS sin conflictos.
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4 overflow-y-auto">
        {activeTab === 'diagnose' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">
                Incidencia reportada por: {scenario.ticketSender}
              </div>
              <p className="text-sm text-slate-200 bg-slate-950/90 border border-slate-800/90 rounded-lg p-3.5 italic">
                {scenario.symptomReport}
              </p>
            </div>

            <form onSubmit={handleVerifyDiagnosis} className="space-y-3.5">
              <div>
                <label
                  htmlFor="suspect-host-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  ¿Qué equipo presenta el fallo de configuración?
                </label>
                <select
                  id="suspect-host-select"
                  value={suspectedHostId}
                  onChange={(e) => {
                    setSuspectedHostId(e.target.value);
                    setDiagnosisFeedback(null);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {allHosts.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — {h.userLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="suspect-fault-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  ¿Cuál es la causa raíz que impide su funcionamiento normal?
                </label>
                <select
                  id="suspect-fault-select"
                  value={suspectedFault}
                  onChange={(e) => {
                    setSuspectedFault(e.target.value as FaultType);
                    setDiagnosisFeedback(null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {SELECTABLE_FAULTS.map((ft) => (
                    <option key={ft} value={ft}>
                      {FAULT_LABELS[ft]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Validar Diagnóstico</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reparar IP ({activeHost.name})</span>
                </button>
              </div>
            </form>

            {diagnosisFeedback && (
              <div
                className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                  diagnosisFeedback.correct
                    ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/35 border-rose-500/40 text-rose-200'
                }`}
              >
                {diagnosisFeedback.correct ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>{diagnosisFeedback.message}</div>
              </div>
            )}

            {/* Progressive Hints Section */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Pistas de Investigación ({revealedHintsCount}/
                  {scenario.hints.length})
                </span>
                {revealedHintsCount < scenario.hints.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedHintsCount((prev) =>
                        Math.min(scenario.hints.length, prev + 1)
                      )
                    }
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline cursor-pointer"
                  >
                    Mostrar siguiente pista
                  </button>
                )}
              </div>

              {revealedHintsCount > 0 && (
                <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  {scenario.hints
                    .slice(0, revealedHintsCount)
                    .map((hint, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {hint}
                      </li>
                    ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Propiedades de Internet Protocol versión 4 (TCP/IPv4)
                </h3>
                <p className="text-xs text-slate-400">
                  Editando adaptador Ethernet0 de{' '}
                  <strong className="text-sky-400 font-mono">
                    {activeHost.name}
                  </strong>{' '}
                  ({activeHost.userLabel})
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                MAC: {activeHost.mac}
              </span>
            </div>

            <form onSubmit={handleApplyTcpIp} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tcp-ip-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Dirección IPv4:
                  </label>
                  <input
                    id="tcp-ip-input"
                    type="text"
                    value={ipInput}
                    onChange={(e) => {
                      setIpInput(e.target.value);
                      setConfigSavedBanner(null);
                    }}
                    className={`w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border rounded-lg text-slate-100 focus:outline-none ${
                      isValidIp(ipInput)
                        ? 'border-slate-700 focus:border-sky-500'
                        : 'border-rose-500'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="tcp-mask-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Máscara de subred:
                  </label>
                  <input
                    id="tcp-mask-input"
                    type="text"
                    value={maskInput}
                    onChange={(e) => {
                      setMaskInput(e.target.value);
                      setConfigSavedBanner(null);
                    }}
                    className={`w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border rounded-lg text-slate-100 focus:outline-none ${
                      isValidMask(maskInput)
                        ? 'border-slate-700 focus:border-sky-500'
                        : 'border-rose-500'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="tcp-gw-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Puerta de enlace predeterminada:
                  </label>
                  <input
                    id="tcp-gw-input"
                    type="text"
                    value={gwInput}
                    onChange={(e) => {
                      setGwInput(e.target.value);
                      setConfigSavedBanner(null);
                    }}
                    className={`w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border rounded-lg text-slate-100 focus:outline-none ${
                      isValidIp(gwInput)
                        ? 'border-slate-700 focus:border-sky-500'
                        : 'border-rose-500'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="tcp-dns-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Servidor DNS preferido:
                  </label>
                  <input
                    id="tcp-dns-input"
                    type="text"
                    value={dnsInput}
                    onChange={(e) => {
                      setDnsInput(e.target.value);
                      setConfigSavedBanner(null);
                    }}
                    className={`w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border rounded-lg text-slate-100 focus:outline-none ${
                      isValidIp(dnsInput)
                        ? 'border-slate-700 focus:border-sky-500'
                        : 'border-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* Live Subnet Calculator Preview for the entered IP/Mask */}
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 text-xs font-mono tabular-nums space-y-1">
                <div className="text-slate-400 font-sans font-medium mb-1">
                  Cálculo en tiempo real según la IP y Máscara introducidas:
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Red calculada:</span>
                  <span className="text-sky-300">
                    {previewNetAddr}
                    {previewCidr ? ` /${previewCidr}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rango hosts útiles:</span>
                  <span className="text-slate-200">{previewRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dirección Broadcast:</span>
                  <span className="text-slate-300">{previewBroadcast}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Aplicar Cambios en {activeHost.name}</span>
                </button>

                <span className="text-[11px] text-slate-400">
                  Estado:{' '}
                  <strong className="text-slate-200">
                    {healthMap[activeHost.id]?.summaryText}
                  </strong>
                </span>
              </div>
            </form>

            {configSavedBanner && (
              <div className="p-3 rounded-lg bg-sky-950/35 border border-sky-500/40 text-xs text-sky-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{configSavedBanner}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 32-BIT BINARY SUBNETTING INSPECTOR */}
        {activeTab === 'binary' && (
          <div className="space-y-3.5 text-xs">
            <div className="pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                Inspector Binario de Subred (Operación AND de 32 bits)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprueba bit a bit si{' '}
                <strong className="text-sky-400 font-mono">
                  {activeHost.name} ({activeHost.ip}/{activeCidr})
                </strong>{' '}
                considera a otro equipo dentro de su misma subred local:
              </p>
            </div>

            {/* Target IP Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Comparar con destino (elige un nodo o escribe una IP):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={compareIp}
                  onChange={(e) => setCompareIp(e.target.value)}
                  className="flex-1 px-3 py-1.5 font-mono text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setCompareIp(router.lanIp)}
                  className="px-2.5 py-1.5 font-mono text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-sky-300 cursor-pointer"
                >
                  GW ({router.lanIp})
                </button>
                {allHosts
                  .filter((h) => h.id !== activeHost.id)
                  .slice(0, 2)
                  .map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setCompareIp(h.ip)}
                      className="px-2.5 py-1.5 font-mono text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 cursor-pointer"
                    >
                      {h.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* 32-bit Binary Matrix */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pb-1 border-b border-slate-900">
                <span>
                  <strong className="text-sky-400">Azul:</strong> Bits de Red (/
                  {activeCidr})
                </span>
                <span>
                  <strong className="text-amber-300">Ámbar:</strong> Bits de
                  Host ({32 - activeCidr} bits ={' '}
                  {getTotalUsableHosts(activeHost.mask)} hosts útiles)
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-mono">
                    IP {activeHost.name} ({activeHost.ip}):
                  </span>
                  {renderColoredBinary(srcBinOctets, activeCidr)}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-mono">
                    Máscara ({activeHost.mask}):
                  </span>
                  {renderColoredBinary(maskBinOctets, activeCidr)}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                  <span className="text-sky-300 font-mono font-semibold">
                    Red Origen ({srcNetIp}):
                  </span>
                  {renderColoredBinary(srcNetBinOctets, activeCidr)}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-900">
                  <span className="text-slate-400 font-mono">
                    IP Destino ({compareIp}):
                  </span>
                  {renderColoredBinary(dstBinOctets, activeCidr)}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-300 font-mono font-semibold">
                    AND Destino ({dstNetUnderSrcMask}):
                  </span>
                  {renderColoredBinary(
                    ipToBinaryOctets(dstNetUnderSrcMask),
                    activeCidr
                  )}
                </div>
              </div>
            </div>

            {/* Binary Conclusion Box */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                sameSubnetResult
                  ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/35 border-amber-500/40 text-amber-200'
              }`}
            >
              {sameSubnetResult ? (
                <span>
                  <strong>Misma Subred:</strong> Los primeros {activeCidr} bits
                  coinciden exactamente ({srcNetIp}). {activeHost.name} enviará
                  tramas Ethernet directamente a {compareIp} mediante ARP por el
                  Switch sin pasar por el Router.
                </span>
              ) : (
                <span>
                  <strong>Subred Distinta:</strong> Los primeros {activeCidr}{' '}
                  bits difieren ({srcNetIp} ≠ {dstNetUnderSrcMask}).{' '}
                  {activeHost.name} considera que {compareIp} es externo y
                  enviará el paquete a su Puerta de Enlace ({activeHost.gateway}
                  ).
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
