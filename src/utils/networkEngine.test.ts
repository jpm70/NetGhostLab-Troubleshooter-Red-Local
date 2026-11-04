import { describe, expect, it } from 'vitest';
import { SCENARIOS, generateRandomScenario } from '../data/scenarios';
import type { HostNode, Scenario } from '../types/network';
import {
  analyzeHostHealth,
  executeTerminalCommand,
  resolveDomain,
  simulateHttpBrowserRequest,
  simulateIpReachability,
} from './networkEngine';

const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));
const host = (s: Scenario, id: string) => s.hosts.find((h) => h.id === id)!;
const run = (s: Scenario, id: string, cmd: string) => executeTerminalCommand(cmd, host(s, id), s.hosts, s.router);
const healthy = (s: Scenario, h: HostNode) => {
  const r = analyzeHostHealth(h, s.hosts, s.router);
  return r.detectedFaults.length === 0 && r.canReachLanPeers && r.canReachGateway && r.canReachInternetIp && r.canResolveDns;
};

/** Aplica la reparación de cada avería esperada, como haría el alumno. */
function repair(s: Scenario): Scenario {
  const fixed = clone(s);
  const base = fixed.router.lanIp.split('.').slice(0, 3).join('.');
  let free = 100;
  const used = () => new Set(fixed.hosts.map((h) => h.ip));
  for (const ef of fixed.expectedFaults) {
    const h = host(fixed, ef.hostId);
    if (ef.faultType === 'WRONG_GATEWAY') h.gateway = fixed.router.lanIp;
    if (ef.faultType === 'INVALID_DNS') h.dns = '8.8.8.8';
    if (ef.faultType === 'WRONG_SUBNET_MASK') h.mask = fixed.router.lanMask;
    if (ef.faultType === 'DUPLICATE_IP' || ef.faultType === 'WRONG_SUBNET_IP') {
      while (used().has(`${base}.${free}`)) free++;
      h.ip = fixed.router.lanMask === '255.255.255.0' ? `${base}.${free}` : `${base}.${(Number(fixed.router.lanIp.split('.')[3]) + 9)}`;
      h.mask = fixed.router.lanMask;
      h.gateway = fixed.router.lanIp;
    }
  }
  return fixed;
}

describe('los 10 casos', () => {
  it.each(SCENARIOS.map((s) => [`${s.number}. ${s.title}`, s] as const))('%s: las averías esperadas existen y no hay otras', (_n, s) => {
    const dupPartners = new Set<string>();
    for (const ef of s.expectedFaults.filter((e) => e.faultType === 'DUPLICATE_IP')) {
      const ip = host(s, ef.hostId).ip;
      s.hosts.filter((h) => h.ip === ip).forEach((h) => dupPartners.add(h.id));
    }
    for (const h of s.hosts) {
      const det = analyzeHostHealth(h, s.hosts, s.router).detectedFaults;
      const exp = s.expectedFaults.filter((e) => e.hostId === h.id).map((e) => e.faultType);
      for (const e of exp) expect(det, `${h.id}: falta ${e}`).toContain(e);
      if (exp.length === 0 && !dupPartners.has(h.id)) expect(det, `${h.id} tiene averías no previstas`).toEqual([]);
    }
  });

  it.each(SCENARIOS.map((s) => [`${s.number}. ${s.title}`, s] as const))('%s: al reparar las averías esperadas la red queda operativa', (_n, s) => {
    const fixed = repair(s);
    for (const h of fixed.hosts) expect(healthy(fixed, h), `${h.id} ${h.ip}/${h.mask}`).toBe(true);
  });

  it('caso 4: PC-03 (/25) llega al NAS de su mitad pero no al router ni a Internet', () => {
    const s = SCENARIOS.find((x) => x.number === 4)!;
    const pc3 = host(s, 'PC-03');
    expect(simulateIpReachability(pc3, '192.168.50.200', s.hosts, s.router).reachable).toBe(true);
    expect(simulateIpReachability(pc3, '192.168.50.1', s.hosts, s.router).reachable).toBe(false);
    expect(simulateIpReachability(pc3, '8.8.8.8', s.hosts, s.router).reachable).toBe(false);
    expect(simulateIpReachability(host(s, 'PC-01'), pc3.ip, s.hosts, s.router).reachable).toBe(false);
  });

  it('caso 4: el analizador no muestra tramas cuando el paquete no puede salir del equipo', () => {
    const s = SCENARIOS.find((x) => x.number === 4)!;
    const ping = run(s, 'PC-03', 'ping 192.168.50.1');
    expect(ping.trace!.packets).toHaveLength(1);
    expect(ping.trace!.packets[0].info).toContain('[Sin enviar]');
    expect(ping.trace!.packets.some((p) => p.protocol === 'ARP')).toBe(false);
  });

  it('caso 10: PC-03 (/26) no ve el servidor .200 ni navega', () => {
    const s = SCENARIOS.find((x) => x.number === 10)!;
    const pc3 = host(s, 'PC-03');
    expect(simulateIpReachability(pc3, '192.168.100.200', s.hosts, s.router).reachable).toBe(false);
    expect(simulateIpReachability(pc3, '8.8.8.8', s.hosts, s.router).reachable).toBe(false);
  });

  it('caso 2 (DNS): hay salida por IP pero no resuelve nombres', () => {
    const s = SCENARIOS.find((x) => x.number === 2)!;
    expect(run(s, 'PC-03', 'ping 8.8.8.8').status).toBe('ok');
    expect(run(s, 'PC-03', 'nslookup www.unfantasmaenelsistema.com').status).toBe('error');
    expect(simulateHttpBrowserRequest('http://185.199.108.153', host(s, 'PC-03'), s.hosts, s.router).ok).toBe(true);
    expect(simulateHttpBrowserRequest('https://www.unfantasmaenelsistema.com', host(s, 'PC-03'), s.hosts, s.router).errorCode).toBe('ERR_NAME_NOT_RESOLVED');
  });
});

describe('retos aleatorios', () => {
  it('500 retos: la avería existe, el resto funciona y al repararla todo queda operativo', () => {
    for (let i = 0; i < 500; i++) {
      const s = generateRandomScenario(i);
      const [ef] = s.expectedFaults;
      const victim = host(s, ef.hostId);
      expect(analyzeHostHealth(victim, s.hosts, s.router).detectedFaults, `${i} ${ef.faultType}`).toContain(ef.faultType);
      expect(healthy(s, victim), `${i}: la víctima no debería funcionar`).toBe(false);
      for (const h of s.hosts) {
        if (h.id === victim.id || h.ip === victim.ip) continue;
        const r = analyzeHostHealth(h, s.hosts, s.router);
        // Los demás no tienen averías propias y salen a Internet (puede que no lleguen a la víctima, como en una red real)
        expect(r.detectedFaults, `${i} ${ef.faultType}: ${h.id}`).toEqual([]);
        expect(r.canReachGateway && r.canReachInternetIp && r.canResolveDns, `${i} ${ef.faultType}: ${h.id}`).toBe(true);
      }
      const fixed = repair(s);
      for (const h of fixed.hosts) expect(healthy(fixed, h), `${i} reparado: ${h.id}`).toBe(true);
    }
  });
});

describe('máscara demasiado larga: el router reenvía (como en una red real)', () => {
  it('un /25 en la mitad baja llega a .200 dando un rodeo por el router, con ICMP Redirect', () => {
    const s = clone(SCENARIOS.find((x) => x.number === 4)!);
    host(s, 'PC-03').ip = '192.168.50.30';
    const r = simulateIpReachability(host(s, 'PC-03'), '192.168.50.200', s.hosts, s.router);
    expect(r).toMatchObject({ reachable: true, viaRouterHairpin: true });
    const ping = run(s, 'PC-03', 'ping 192.168.50.200');
    expect(ping.status).toBe('ok');
    expect(ping.trace!.packets.some((p) => p.info.startsWith('Redirect'))).toBe(true);
    const tr = run(s, 'PC-03', 'tracert 192.168.50.200');
    expect(tr.output.join('\n')).toContain('router.lan.local');
    expect(tr.output.join('\n')).toContain('Rodeo innecesario');
  });
});

describe('DNS coherente', () => {
  const s = SCENARIOS.find((x) => x.number === 1)!;

  it('un dominio desconocido da NXDOMAIN en todas las herramientas', () => {
    expect(resolveDomain('no-existe.example')).toBeNull();
    expect(run(s, 'PC-01', 'nslookup no-existe.example').output.join(' ')).toContain('NXDOMAIN');
    expect(run(s, 'PC-01', 'ping no-existe.example').output.join(' ')).toContain('no pudo encontrar el host');
    expect(run(s, 'PC-01', 'tracert no-existe.example').output.join(' ')).toContain('No se puede resolver');
    expect(simulateHttpBrowserRequest('http://no-existe.example/x', host(s, 'PC-01'), s.hosts, s.router).errorCode).toBe('DNS_PROBE_FINISHED_NXDOMAIN');
  });

  it('el mismo nombre da la misma IP en ping, tracert y nslookup', () => {
    for (const name of ['github.com', 'www.github.com', 'unfantasmaenelsistema.com', 'google.es']) {
      const ip = resolveDomain(name)!;
      expect(ip).toBeTruthy();
      expect(run(s, 'PC-01', `ping ${name}`).output[0]).toContain(`[${ip}]`);
      expect(run(s, 'PC-01', `tracert ${name}`).output[0]).toContain(`[${ip}]`);
      expect(run(s, 'PC-01', `nslookup ${name}`).output.join(' ')).toContain(ip);
    }
  });
});

describe('tracert coherente con ping', () => {
  const s = SCENARIOS.find((x) => x.number === 1)!;

  it('destino de Internet que no responde: tracert no inventa la llegada', () => {
    expect(run(s, 'PC-01', 'ping 5.5.5.5').status).toBe('error');
    const tr = run(s, 'PC-01', 'tracert 5.5.5.5');
    expect(tr.status).toBe('error');
    expect(tr.output.join('\n')).not.toContain('Traza completa');
  });

  it('destino alcanzable: 4 saltos y traza completa', () => {
    const tr = run(s, 'PC-01', 'tracert 8.8.8.8');
    expect(tr.status).toBe('ok');
    expect(tr.output.join('\n')).toContain('Traza completa');
  });

  it('puerta de enlace en otra subred (caso 1): ni ping ni tracert salen', () => {
    expect(run(s, 'PC-02', 'ping 8.8.8.8').status).toBe('error');
    expect(run(s, 'PC-02', 'tracert 8.8.8.8').status).toBe('error');
    expect(run(s, 'PC-02', 'ping 192.168.1.10').status).toBe('ok');
  });
});
