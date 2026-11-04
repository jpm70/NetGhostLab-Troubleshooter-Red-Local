/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  Shuffle,
  Terminal,
} from 'lucide-react';
import { SCENARIOS, generateRandomScenario } from './data/scenarios';
import {
  CapturedPacket,
  HostHealthReport,
  HostNode,
  PacketTrace,
  Scenario,
  TerminalEntry,
} from './types/network';
import {
  FAULT_LABELS,
  analyzeHostHealth,
  executeTerminalCommand,
} from './utils/networkEngine';
import { NetworkTopology } from './components/NetworkTopology';
import { VirtualTerminal } from './components/VirtualTerminal';
import { DiagnosisAndConfigPanel } from './components/DiagnosisAndConfigPanel';
import { MethodologyModal } from './components/MethodologyModal';

const cloneScenario = (sc: Scenario): Scenario => ({
  ...sc,
  router: { ...sc.router },
  hosts: sc.hosts.map((h) => ({ ...h })),
  expectedFaults: sc.expectedFaults.map((ef) => ({ ...ef })),
  hints: [...sc.hints],
});

export default function App() {
  const [scenariosList, setScenariosList] = useState<Scenario[]>(() =>
    SCENARIOS.map(cloneScenario)
  );
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    SCENARIOS[0].id
  );
  const [randomCounter, setRandomCounter] = useState<number>(1);

  const currentScenario = useMemo(
    () =>
      scenariosList.find((s) => s.id === activeScenarioId) || scenariosList[0],
    [scenariosList, activeScenarioId]
  );

  const [selectedHostId, setSelectedHostId] = useState<string>('PC-02');
  const [blindMode, setBlindMode] = useState<boolean>(false);
  const [revealedHostIds, setRevealedHostIds] = useState<Set<string>>(
    () => new Set()
  );
  const [lastTrace, setLastTrace] = useState<PacketTrace | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);

  // Completed scenarios tracking
  const [solvedScenarioIds, setSolvedScenarioIds] = useState<Set<string>>(
    () => {
      try {
        const saved = localStorage.getItem('netghost_solved_scenarios');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
  );

  // Dictamen por caso: averías identificadas («equipo:avería») e intentos erróneos
  const [diagnosisByScenario, setDiagnosisByScenario] = useState<
    Record<string, { found: string[]; wrong: number }>
  >({});
  const recordDiagnosis = (scenarioId: string, foundKey: string | null) => {
    setDiagnosisByScenario((prev) => {
      const cur = prev[scenarioId] || { found: [], wrong: 0 };
      return {
        ...prev,
        [scenarioId]: foundKey
          ? { ...cur, found: cur.found.includes(foundKey) ? cur.found : [...cur.found, foundKey] }
          : { ...cur, wrong: cur.wrong + 1 },
      };
    });
  };
  const resetDiagnosis = (scenarioId: string) =>
    setDiagnosisByScenario((prev) => ({ ...prev, [scenarioId]: { found: [], wrong: 0 } }));

  const markScenarioSolved = (id: string) => {
    setSolvedScenarioIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(
          'netghost_solved_scenarios',
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Ignore storage errors in restricted iframes
      }
      return next;
    });
  };

  // Terminal history per scenario & host key: `${scenarioId}:${hostId}`
  const [terminalHistories, setTerminalHistories] = useState<
    Record<string, TerminalEntry[]>
  >({});

  // Captured Wireshark PDU frames per scenario & host key
  const [packetCaptures, setPacketCaptures] = useState<
    Record<string, CapturedPacket[]>
  >({});

  const activeHost = useMemo(
    () =>
      currentScenario.hosts.find((h) => h.id === selectedHostId) ||
      currentScenario.hosts[0],
    [currentScenario, selectedHostId]
  );

  // Compute real-time health for all hosts in the active scenario
  const healthMap = useMemo(() => {
    const map: Record<string, HostHealthReport> = {};
    for (const h of currentScenario.hosts) {
      map[h.id] = analyzeHostHealth(
        h,
        currentScenario.hosts,
        currentScenario.router
      );
    }
    return map;
  }, [currentScenario]);

  const isScenarioFullyRepaired = useMemo(() => {
    return currentScenario.hosts.every((h) => {
      const rep = healthMap[h.id];
      return (
        rep &&
        rep.canReachLanPeers &&
        rep.canReachGateway &&
        rep.canReachInternetIp &&
        rep.canResolveDns &&
        rep.detectedFaults.length === 0
      );
    });
  }, [currentScenario.hosts, healthMap]);

  // El caso se da por superado cuando se han identificado TODAS sus averías y la red funciona
  const currentDiagnosis = diagnosisByScenario[currentScenario.id] || { found: [], wrong: 0 };
  const allFaultsDiagnosed = currentScenario.expectedFaults.every((ef) =>
    currentDiagnosis.found.includes(`${ef.hostId}:${ef.faultType}`)
  );
  React.useEffect(() => {
    if (isScenarioFullyRepaired && allFaultsDiagnosed) {
      markScenarioSolved(currentScenario.id);
    }
  }, [isScenarioFullyRepaired, allFaultsDiagnosed, currentScenario.id]);

  // Los retos aleatorios no cuentan para el progreso de los 10 casos
  const solvedFixedCount = SCENARIOS.filter((s) => solvedScenarioIds.has(s.id)).length;
  const currentSolved = solvedScenarioIds.has(currentScenario.id);

  const historyKey = `${currentScenario.id}:${activeHost.id}`;
  const activeHistory = terminalHistories[historyKey] || [];
  const activePackets = packetCaptures[historyKey] || [];

  const appendTracePackets = (key: string, trace?: PacketTrace) => {
    if (!trace || !trace.packets || trace.packets.length === 0) return;
    setPacketCaptures((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ...trace.packets],
    }));
  };

  const handleRunCommand = (rawCmd: string) => {
    const result = executeTerminalCommand(
      rawCmd,
      activeHost,
      currentScenario.hosts,
      currentScenario.router
    );

    const firstWord = rawCmd.trim().split(/\s+/)[0]?.toLowerCase();
    if (
      firstWord === 'ipconfig' ||
      firstWord === 'ifconfig' ||
      firstWord === 'ip'
    ) {
      setRevealedHostIds((prev) => {
        const next = new Set(prev);
        next.add(activeHost.id);
        return next;
      });
    }

    if (result.trace) {
      setLastTrace(result.trace);
      appendTracePackets(historyKey, result.trace);
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);

    const newEntry: TerminalEntry = {
      id: `${Date.now()}-${Math.random()}`,
      command: rawCmd,
      output: result.output,
      status: result.status,
      timestamp: timeStr,
    };

    setTerminalHistories((prev) => ({
      ...prev,
      [historyKey]: [...(prev[historyKey] || []), newEntry],
    }));
  };

  const handleBrowserTrace = (trace: PacketTrace) => {
    setLastTrace(trace);
    appendTracePackets(historyKey, trace);
  };

  const handleClearHistory = () => {
    setTerminalHistories((prev) => ({
      ...prev,
      [historyKey]: [],
    }));
  };

  const handleClearPackets = () => {
    setPacketCaptures((prev) => ({
      ...prev,
      [historyKey]: [],
    }));
  };

  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setLastTrace(null);
    setRevealedHostIds(new Set());
    const target = scenariosList.find((s) => s.id === scenarioId);
    if (target) {
      const preferredHost =
        target.expectedFaults[0]?.hostId || target.hosts[0].id;
      setSelectedHostId(preferredHost);
    }
  };

  const handleGenerateRandomCase = () => {
    const newCase = generateRandomScenario(randomCounter);
    setRandomCounter((c) => c + 1);
    setScenariosList((prev) => {
      const withoutOldRandom = prev.filter((s) => !s.isRandom);
      return [...withoutOldRandom, newCase];
    });
    setActiveScenarioId(newCase.id);
    setSelectedHostId(newCase.hosts[0].id);
    setLastTrace(null);
    setRevealedHostIds(new Set());
  };

  const handleUpdateHostConfig = (
    hostId: string,
    updated: Pick<HostNode, 'ip' | 'mask' | 'gateway' | 'dns'>
  ) => {
    setScenariosList((prev) =>
      prev.map((sc) => {
        if (sc.id !== currentScenario.id) return sc;
        return {
          ...sc,
          hosts: sc.hosts.map((h) =>
            h.id === hostId ? { ...h, ...updated } : h
          ),
        };
      })
    );
    setLastTrace(null);
  };

  const handleResetCurrentScenario = () => {
    const original = SCENARIOS.find((s) => s.id === currentScenario.id);
    if (original) {
      setScenariosList((prev) =>
        prev.map((sc) =>
          sc.id === currentScenario.id ? cloneScenario(original) : sc
        )
      );
    } else if (currentScenario.isRandom) {
      handleGenerateRandomCase();
      return;
    }
    setLastTrace(null);
    setRevealedHostIds(new Set());
    resetDiagnosis(currentScenario.id);
  };

  const handleExportLabReport = () => {
    const dateStr = new Date().toLocaleString('es-ES');
    const lines: string[] = [
      `# Informe de Laboratorio — NetGhost Lab (Un Fantasma en el Sistema)`,
      `- **Fecha de generación:** ${dateStr}`,
      `- **Web de referencia:** https://www.unfantasmaenelsistema.com/`,
      `- **Progreso global del alumno:** ${solvedFixedCount}/${SCENARIOS.length} casos superados`,
      '',
      `## Escenario Activo: Caso ${currentScenario.number} — ${currentScenario.title}`,
      `- **Subtítulo:** ${currentScenario.subtitle}`,
      `- **Ticket de incidencia:** ${currentScenario.symptomReport}`,
      `- **Estado actual de la red:** ${isScenarioFullyRepaired ? '100% REPARADA Y OPERATIVA' : 'EN DIAGNÓSTICO / PENDIENTE DE REPARACIÓN'}`,
      `- **Dictamen del alumno:** ${currentScenario.expectedFaults.filter((ef) => currentDiagnosis.found.includes(`${ef.hostId}:${ef.faultType}`)).length}/${currentScenario.expectedFaults.length} averías identificadas · ${currentDiagnosis.wrong} dictámenes erróneos`,
      '',
      `### Tabla de Configuración TCP/IPv4 Actual`,
      `| Dispositivo | Usuario / Rol | Dirección IPv4 | Máscara de Subred | Puerta de Enlace | Servidor DNS | Estado |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
      `| **${currentScenario.router.name}** | Gateway LAN/WAN | \`${currentScenario.router.lanIp}\` | \`${currentScenario.router.lanMask}\` | \`${currentScenario.router.ispGateway}\` | \`${currentScenario.router.dnsForwarder}\` | Operativo |`,
    ];

    for (const h of currentScenario.hosts) {
      const rep = healthMap[h.id];
      const statusStr =
        rep.detectedFaults.length === 0
          ? 'Operativo (LAN/WAN/DNS OK)'
          : rep.detectedFaults.map((f) => FAULT_LABELS[f]).join(', ');
      lines.push(
        `| **${h.name}** | ${h.userLabel} | \`${h.ip}\` | \`${h.mask}\` | \`${h.gateway}\` | \`${h.dns}\` | ${statusStr} |`
      );
    }

    lines.push('', '### Diagnóstico Esperado del Escenario');
    if (currentSolved) {
      for (const ef of currentScenario.expectedFaults) {
        lines.push(
          `- **Nodo afectado:** \`${ef.hostId}\` — **Fallo:** ${FAULT_LABELS[ef.faultType]}`,
          `  - *Explicación técnica:* ${ef.explanation}`
        );
      }
    } else {
      lines.push('- *La solución se incluye en el informe cuando el caso está resuelto (dictamen completo y red reparada).*');
    }

    lines.push('', '### Registro de Comandos Ejecutados en el Escenario');
    let hasCommands = false;
    for (const h of currentScenario.hosts) {
      const hKey = `${currentScenario.id}:${h.id}`;
      const entries = terminalHistories[hKey] || [];
      if (entries.length > 0) {
        hasCommands = true;
        lines.push(`#### Consola de ${h.name} (${h.userLabel})`);
        for (const e of entries) {
          lines.push(`\`\`\`text`, `C:\\Users\\Admin@${h.name}> ${e.command}`);
          lines.push(...e.output, `\`\`\``);
        }
      }
    }
    if (!hasCommands) {
      lines.push('_No se han registrado comandos en este escenario todavía._');
    }

    const blob = new Blob([lines.join('\n')], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-netghost-caso-${currentScenario.number}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="flex items-center justify-between gap-3 lg:gap-8 px-4 sm:px-6 py-3.5 bg-slate-950/95 border-b border-slate-800/90 sticky top-0 z-30 backdrop-blur-md">
        {/* Zone 1: Brand Title (One line) */}
        <a
          href="https://www.unfantasmaenelsistema.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-base font-bold tracking-tight text-slate-100 hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
        >
          {!logoLoadError ? (
            <img
              src="./assets/aistudio/icono_81a3db5b.png"
              alt="Logo Un Fantasma en el Sistema"
              onError={() => setLogoLoadError(true)}
              className="w-8 h-8 object-contain rounded-md bg-slate-900/80 p-0.5 border border-slate-800"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-sky-400" />
            </div>
          )}
          <span className="hidden sm:inline">Un Fantasma en el Sistema</span>
          <span className="sm:hidden">NetGhost Lab</span>
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="#casos-practicos"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Casos Prácticos
          </a>
          <a
            href="#topologia-red"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Topología LAN
          </a>
          <button
            type="button"
            onClick={() => setIsMethodologyOpen(true)}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Metodología TCP/IP
          </button>
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-sky-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Web Oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGenerateRandomCase}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-500 hover:bg-sky-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo Caso Aleatorio</span>
            <span className="sm:hidden">Aleatorio</span>
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px desktop presence) */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Compact Hero & Scenario Selector Strip */}
        <section
          id="casos-practicos"
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Simulador de Diagnóstico de Redes Locales</span>
                <span aria-hidden="true">·</span>
                <span>Nivel: {currentScenario.difficulty}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-sky-400">
                  Casos resueltos: {solvedFixedCount}/{SCENARIOS.length}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {String(currentScenario.number).padStart(2, '0')}.{' '}
                {currentScenario.title} —{' '}
                <span className="text-sky-400 font-semibold">
                  {currentScenario.subtitle}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-4xl">
                <strong className="text-slate-100 font-medium">
                  Objetivo didáctico:
                </strong>{' '}
                {currentScenario.learningObjective}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleExportLabReport}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-sky-300 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>Exportar Informe (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMethodologyOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Guía de Diagnóstico en 5 Pasos</span>
              </button>
            </div>
          </div>

          {/* Interactive Scenario Filter / Selector Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1">
            {scenariosList.map((sc) => {
              const isCurrent = sc.id === currentScenario.id;
              const isSolved = solvedScenarioIds.has(sc.id);
              const numLabel = String(sc.number).padStart(2, '0');
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                      : isSolved
                      ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/50'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {isSolved && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        isCurrent ? 'text-slate-950' : 'text-emerald-400'
                      }`}
                    />
                  )}
                  <span>
                    {sc.isRandom ? sc.title : `Caso ${numLabel}: ${sc.title}`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interactive Network Topology Canvas */}
        <section id="topologia-red">
          <NetworkTopology
            router={currentScenario.router}
            hosts={currentScenario.hosts}
            selectedHostId={selectedHostId}
            onSelectHost={setSelectedHostId}
            healthMap={healthMap}
            blindMode={blindMode}
            onToggleBlindMode={() => setBlindMode((b) => !b)}
            revealedHostIds={revealedHostIds}
            lastTrace={lastTrace}
            onQuickPingFromActive={(targetIp) =>
              handleRunCommand(`ping ${targetIp}`)
            }
          />
        </section>

        {/* Bottom Split Workspace: Virtual Terminal + Sniffer + Browser (Left 7 cols) + Diagnosis & TCP/IP & Binary (Right 5 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <VirtualTerminal
              activeHost={activeHost}
              allHosts={currentScenario.hosts}
              router={currentScenario.router}
              history={activeHistory}
              capturedPackets={activePackets}
              onRunCommand={handleRunCommand}
              onClearHistory={handleClearHistory}
              onClearPackets={handleClearPackets}
              onSelectHost={setSelectedHostId}
              onBrowserTrace={handleBrowserTrace}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <DiagnosisAndConfigPanel
              scenario={currentScenario}
              activeHost={activeHost}
              allHosts={currentScenario.hosts}
              router={currentScenario.router}
              healthMap={healthMap}
              onUpdateHostConfig={handleUpdateHostConfig}
              onResetScenario={handleResetCurrentScenario}
              onDiagnosis={(key) => recordDiagnosis(currentScenario.id, key)}
              diagnosisProgress={currentDiagnosis}
              isScenarioFullyRepaired={isScenarioFullyRepaired}
              onExportReport={handleExportLabReport}
            />
          </div>
        </section>
      </main>

      {/* Clean Branded Educational Footer */}
      <footer className="mt-8 border-t border-slate-900 bg-slate-950 px-6 py-5">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {!logoLoadError && (
              <img
                src="./assets/aistudio/icono_81a3db5b.png"
                alt="Un Fantasma en el Sistema"
                onError={() => setLogoLoadError(true)}
                className="w-6 h-6 object-contain"
              />
            )}
            <span>
              Desarrollado para el aprendizaje práctico de redes locales ·{' '}
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 font-medium underline-offset-4 hover:underline"
              >
                www.unfantasmaenelsistema.com
              </a>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-mono tabular-nums">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              Progreso del Alumno: {solvedFixedCount}/{SCENARIOS.length}{' '}
              escenarios superados
            </span>
          </div>
        </div>
      </footer>

      {/* Methodology Reference Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
}
