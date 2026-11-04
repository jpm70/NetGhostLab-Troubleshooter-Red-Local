import {
  CapturedPacket,
  FaultType,
  HostHealthReport,
  HostNode,
  PacketTrace,
  RouterConfig,
} from '../types/network';

// Known public DNS servers in the simulation
export const VALID_PUBLIC_DNS: Record<string, string> = {
  '8.8.8.8': 'dns.google',
  '8.8.4.4': 'dns2.google',
  '1.1.1.1': 'one.one.one.one',
  '9.9.9.9': 'dns.quad9.net',
};

// Known external domain records for nslookup / ping / tracert / browser
export const DNS_RECORDS: Record<string, string> = {
  'unfantasmaenelsistema.com': '185.199.108.153',
  'www.unfantasmaenelsistema.com': '185.199.108.153',
  'github.com': '140.82.121.4',
  'www.github.com': '140.82.121.4',
  'google.es': '142.250.184.163',
  'www.google.es': '142.250.184.163',
  'google.com': '142.250.184.174',
  'cloudflare.com': '104.16.132.229',
  'dns.google': '8.8.8.8',
  'one.one.one.one': '1.1.1.1',
};

/** Normaliza lo que escribe el alumno (quita http://, rutas y mayúsculas). */
export function cleanDomainInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '');
}

/** Resolución DNS de la simulación: registro A conocido o null (NXDOMAIN). */
export function resolveDomain(raw: string): string | null {
  const d = cleanDomainInput(raw);
  return DNS_RECORDS[d] ?? DNS_RECORDS[`www.${d}`] ?? null;
}

// Known reachable external IPs in the WAN simulation
export const REACHABLE_WAN_IPS = new Set<string>([
  '8.8.8.8',
  '8.8.4.4',
  '1.1.1.1',
  '9.9.9.9',
  '185.199.108.153',
  '140.82.121.4',
  '142.250.184.163',
  '142.250.184.174',
  '104.16.132.229',
]);

export function isValidIp(ip: string): boolean {
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    if (num < 0 || num > 255) return false;
  }
  return true;
}

export function ipToInt(ip: string): number {
  if (!isValidIp(ip)) return 0;
  const parts = ip.trim().split('.').map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

export function intToIp(int: number): string {
  const unsigned = int >>> 0;
  return [
    (unsigned >>> 24) & 255,
    (unsigned >>> 16) & 255,
    (unsigned >>> 8) & 255,
    unsigned & 255,
  ].join('.');
}

export function ipToBinaryOctets(ip: string): string[] {
  if (!isValidIp(ip)) return ['00000000', '00000000', '00000000', '00000000'];
  return ip
    .trim()
    .split('.')
    .map((octet) => Number(octet).toString(2).padStart(8, '0'));
}

export function ipToBinaryString32(ip: string): string {
  return ipToBinaryOctets(ip).join('');
}

export function isValidMask(mask: string): boolean {
  if (!isValidIp(mask)) return false;
  const val = ipToInt(mask);
  if (val === 0) return false;
  const inverted = (~val) >>> 0;
  const isContiguous = ((inverted + 1) & inverted) === 0;
  const cidr = maskToCidr(mask);
  return isContiguous && cidr >= 8 && cidr <= 30;
}

export function maskToCidr(mask: string): number {
  if (!isValidIp(mask)) return 0;
  let val = ipToInt(mask);
  let bits = 0;
  while (val & 0x80000000) {
    bits++;
    val = (val << 1) >>> 0;
  }
  return bits;
}

export function getNetworkAddress(ip: string, mask: string): string {
  if (!isValidIp(ip) || !isValidMask(mask)) return '0.0.0.0';
  return intToIp((ipToInt(ip) & ipToInt(mask)) >>> 0);
}

export function getBroadcastAddress(ip: string, mask: string): string {
  if (!isValidIp(ip) || !isValidMask(mask)) return '255.255.255.255';
  const net = ipToInt(ip) & ipToInt(mask);
  const invMask = (~ipToInt(mask)) >>> 0;
  return intToIp((net | invMask) >>> 0);
}

export function getUsableHostRange(ip: string, mask: string): string {
  if (!isValidIp(ip) || !isValidMask(mask)) return 'N/A';
  const net = (ipToInt(ip) & ipToInt(mask)) >>> 0;
  const bcast = (net | ((~ipToInt(mask)) >>> 0)) >>> 0;
  if (bcast - net <= 1) return 'N/A';
  return `${intToIp(net + 1)} - ${intToIp(bcast - 1)}`;
}

export function getTotalUsableHosts(mask: string): number {
  if (!isValidMask(mask)) return 0;
  const cidr = maskToCidr(mask);
  const hostBits = 32 - cidr;
  if (hostBits <= 1) return 0;
  return Math.pow(2, hostBits) - 2;
}

export function isSameSubnet(ipA: string, ipB: string, mask: string): boolean {
  if (!isValidIp(ipA) || !isValidIp(ipB) || !isValidMask(mask)) return false;
  const m = ipToInt(mask);
  return ((ipToInt(ipA) & m) >>> 0) === ((ipToInt(ipB) & m) >>> 0);
}

export function isHostIpUsableInSubnet(ip: string, mask: string): boolean {
  if (!isValidIp(ip) || !isValidMask(mask)) return false;
  const ipNum = ipToInt(ip);
  const net = (ipNum & ipToInt(mask)) >>> 0;
  const bcast = (net | ((~ipToInt(mask)) >>> 0)) >>> 0;
  return ipNum > net && ipNum < bcast;
}

export function isValidDnsServer(
  dnsIp: string,
  router: RouterConfig
): boolean {
  if (!isValidIp(dnsIp)) return false;
  if (dnsIp in VALID_PUBLIC_DNS) return true;
  if (dnsIp === router.lanIp) return true;
  return false;
}

/**
 * Analyzes a single host against the router and all other hosts on the LAN.
 */
export function analyzeHostHealth(
  host: HostNode,
  allHosts: HostNode[],
  router: RouterConfig
): HostHealthReport {
  const detectedFaults: FaultType[] = [];
  const ipOk = isValidIp(host.ip);
  const maskOk = isValidMask(host.mask);
  const gwOk = isValidIp(host.gateway);
  const dnsFormatOk = isValidIp(host.dns);

  const duplicateHosts = allHosts.filter(
    (other) => other.id !== host.id && other.ip.trim() === host.ip.trim()
  );
  const collidesWithRouter = host.ip.trim() === router.lanIp.trim();

  if (duplicateHosts.length > 0 || collidesWithRouter) {
    detectedFaults.push('DUPLICATE_IP');
  }

  const inRouterLanByRouterMask =
    ipOk &&
    isSameSubnet(host.ip, router.lanIp, router.lanMask) &&
    isHostIpUsableInSubnet(host.ip, router.lanMask);

  if (!inRouterLanByRouterMask) {
    detectedFaults.push('WRONG_SUBNET_IP');
  }

  if (
    !maskOk ||
    host.mask.trim() !== router.lanMask.trim() ||
    (ipOk && !isHostIpUsableInSubnet(host.ip, host.mask))
  ) {
    detectedFaults.push('WRONG_SUBNET_MASK');
  }

  const gatewayMatchesRouter =
    gwOk && host.gateway.trim() === router.lanIp.trim();
  const gatewayInHostSubnet =
    ipOk && maskOk && gwOk && isSameSubnet(host.ip, host.gateway, host.mask);

  if (!gatewayMatchesRouter || !gatewayInHostSubnet) {
    detectedFaults.push('WRONG_GATEWAY');
  }

  const dnsIsKnownGood =
    dnsFormatOk && isValidDnsServer(host.dns.trim(), router);
  if (!dnsIsKnownGood) {
    detectedFaults.push('INVALID_DNS');
  }

  const hasIpConflict = detectedFaults.includes('DUPLICATE_IP');

  const canReachGateway =
    ipOk &&
    maskOk &&
    !hasIpConflict &&
    isHostIpUsableInSubnet(host.ip, host.mask) &&
    isSameSubnet(host.ip, router.lanIp, host.mask) &&
    isSameSubnet(host.ip, router.lanIp, router.lanMask) &&
    isHostIpUsableInSubnet(host.ip, router.lanMask);

  const otherHealthyPeers = allHosts.filter(
    (h) =>
      h.id !== host.id &&
      isSameSubnet(h.ip, router.lanIp, router.lanMask) &&
      h.ip !== host.ip
  );
  const canReachLanPeers =
    ipOk &&
    maskOk &&
    !hasIpConflict &&
    isHostIpUsableInSubnet(host.ip, host.mask) &&
    otherHealthyPeers.every(
      (peer) =>
        isSameSubnet(host.ip, peer.ip, host.mask) &&
        isSameSubnet(peer.ip, host.ip, peer.mask)
    );

  const canReachInternetIp = canReachGateway && gatewayMatchesRouter;

  const canResolveDns =
    dnsIsKnownGood &&
    (host.dns.trim() === router.lanIp.trim()
      ? canReachGateway
      : canReachInternetIp);

  let summaryText = 'Configuración óptima. Conectividad LAN y WAN completa.';
  if (detectedFaults.includes('DUPLICATE_IP')) {
    summaryText = `Conflicto de IP duplicada (${host.ip}) en el segmento local.`;
  } else if (detectedFaults.includes('WRONG_SUBNET_IP')) {
    summaryText = `Dirección IP (${host.ip}) fuera de la red local (${getNetworkAddress(router.lanIp, router.lanMask)}/${maskToCidr(router.lanMask)}).`;
  } else if (detectedFaults.includes('WRONG_SUBNET_MASK')) {
    summaryText = `Máscara de subred (${host.mask}) incompatible con el segmento LAN (${router.lanMask}).`;
  } else if (detectedFaults.includes('WRONG_GATEWAY')) {
    summaryText = `Puerta de enlace (${host.gateway}) incorrecta o inalcanzable; sin salida a Internet.`;
  } else if (detectedFaults.includes('INVALID_DNS')) {
    summaryText = `Servidor DNS (${host.dns}) inexistente o sin servicio de resolución de nombres.`;
  }

  return {
    hostId: host.id,
    isValidFormat: ipOk && maskOk && gwOk && dnsFormatOk,
    detectedFaults,
    duplicateWithHostIds: duplicateHosts.map((h) => h.id),
    canReachLanPeers,
    canReachGateway,
    canReachInternetIp,
    canResolveDns,
    networkAddress: getNetworkAddress(host.ip, host.mask),
    broadcastAddress: getBroadcastAddress(host.ip, host.mask),
    cidr: maskToCidr(host.mask),
    hostRange: getUsableHostRange(host.ip, host.mask),
    summaryText,
  };
}

export const FAULT_LABELS: Record<FaultType, string> = {
  NONE: 'Sin fallos (Operativo)',
  WRONG_GATEWAY: 'Puerta de enlace (Gateway) incorrecta o en otra subred',
  INVALID_DNS: 'Servidor DNS inexistente o sin respuesta',
  DUPLICATE_IP: 'Dirección IP duplicada (Conflicto ARP)',
  WRONG_SUBNET_MASK: 'Máscara de subred incorrecta',
  WRONG_SUBNET_IP: 'Dirección IP del equipo en otra subred distinta',
};

/**
 * Helper to resolve MAC of next-hop (either direct peer on LAN or Default Gateway).
 */
function resolveNextHopMac(
  source: HostNode,
  targetIp: string,
  allHosts: HostNode[],
  router: RouterConfig
): { dstMac: string; nextHopIp: string; isLocal: boolean } {
  const isLocal = isSameSubnet(source.ip, targetIp, source.mask);
  const nextHopIp = isLocal ? targetIp : source.gateway;

  if (nextHopIp === router.lanIp) {
    return { dstMac: router.mac, nextHopIp, isLocal };
  }
  const peer = allHosts.find((h) => h.ip === nextHopIp && h.id !== source.id);
  if (peer) {
    return { dstMac: peer.mac, nextHopIp, isLocal };
  }
  return { dstMac: 'FF:FF:FF:FF:FF:FF (Sin respuesta ARP)', nextHopIp, isLocal };
}

/**
 * Generates realistic Wireshark-like PDU frames for a simulated trace.
 */
function buildCapturedPackets(
  source: HostNode,
  targetIp: string,
  protocol: 'ICMP' | 'DNS' | 'ARP' | 'HTTP',
  reachResult: ReturnType<typeof simulateIpReachability>,
  allHosts: HostNode[],
  router: RouterConfig,
  domainQuery?: string
): CapturedPacket[] {
  const packets: CapturedPacket[] = [];
  const { dstMac, nextHopIp, isLocal } = resolveNextHopMac(
    source,
    targetIp,
    allHosts,
    router
  );
  const baseId = Date.now();

  if (reachResult.status === 'conflict') {
    const collider = allHosts.find(
      (h) => h.id !== source.id && h.ip === source.ip
    );
    packets.push({
      id: `${baseId}-1`,
      seq: 1,
      timeOffsetMs: 0,
      protocol: 'ARP',
      srcMac: source.mac,
      dstMac: 'FF:FF:FF:FF:FF:FF',
      srcIp: source.ip,
      dstIp: source.ip,
      ttl: 1,
      length: 42,
      info: `Gratuitous ARP for ${source.ip} (Request)`,
      status: 'warn',
      layer2Detail: `Ethernet II, Src: ${source.mac} (${source.name}), Dst: Broadcast (ff:ff:ff:ff:ff:ff)`,
      layer3Detail: `Address Resolution Protocol (ARP) — Detección de Dirección Duplicada (DAD) para ${source.ip}`,
      layer4Detail: `Conflicto detectado: otro adaptador en el Switch reclama la misma dirección IPv4.`,
    });
    packets.push({
      id: `${baseId}-2`,
      seq: 2,
      timeOffsetMs: 1.2,
      protocol: 'ARP',
      srcMac: collider?.mac || router.mac,
      dstMac: source.mac,
      srcIp: source.ip,
      dstIp: source.ip,
      ttl: 1,
      length: 42,
      info: `[ALERTA COLISIÓN] ${source.ip} is at ${collider?.mac || router.mac} (Duplicate IP detected!)`,
      status: 'error',
      layer2Detail: `Ethernet II, Src: ${collider?.mac || router.mac} (${collider?.name || router.name}), Dst: ${source.mac}`,
      layer3Detail: `ARP Reply conflictivo: dos direcciones físicas MAC responden por ${source.ip}`,
      layer4Detail: `El sistema operativo bloquea la pila IPv4 en ${source.name} para evitar corrupción de tráfico.`,
    });
    return packets;
  }

  // El fallo está en el propio equipo (sin ruta, IP o máscara inválidas): no sale ninguna trama
  if (!reachResult.reachable && reachResult.failedAtNodeId === source.id) {
    packets.push({
      id: `${baseId}-local`,
      seq: 1,
      timeOffsetMs: 0,
      protocol,
      srcMac: source.mac,
      dstMac: '—',
      srcIp: source.ip,
      dstIp: targetIp,
      ttl: 0,
      length: 0,
      info: `[Sin enviar] ${source.name} no tiene ruta hacia ${targetIp}`,
      status: 'error',
      layer2Detail: `Ninguna trama sale de la interfaz Ethernet0: la pila IPv4 descarta el paquete antes de enviarlo.`,
      layer3Detail: `Causa de Capa 3: ${reachResult.reason}`,
      layer4Detail: `El propio equipo responde «Host de destino inaccesible». Revisa su IP, máscara y puerta de enlace.`,
    });
    return packets;
  }

  // Step 1: ARP Resolution for nextHopIp
  if (dstMac.startsWith('FF:FF:FF:FF')) {
    packets.push({
      id: `${baseId}-arp-req`,
      seq: 1,
      timeOffsetMs: 0,
      protocol: 'ARP',
      srcMac: source.mac,
      dstMac: 'FF:FF:FF:FF:FF:FF',
      srcIp: source.ip,
      dstIp: nextHopIp,
      ttl: 1,
      length: 42,
      info: `Who has ${nextHopIp}? Tell ${source.ip} (Sin respuesta en el Switch)`,
      status: 'error',
      layer2Detail: `Ethernet II, Src: ${source.mac} (${source.name}), Dst: Broadcast (ff:ff:ff:ff:ff:ff)`,
      layer3Detail: `ARP Request: ${source.name} busca la MAC de ${nextHopIp} (${isLocal ? 'Destino en la misma subred según su máscara' : 'Puerta de enlace predeterminada'})`,
      layer4Detail: `Nadie en la LAN tiene la IP ${nextHopIp}. El host emite "Host de destino inaccesible".`,
    });
    return packets;
  }

  // Valid ARP exchange
  packets.push({
    id: `${baseId}-arp-ok`,
    seq: 1,
    timeOffsetMs: 0.4,
    protocol: 'ARP',
    srcMac: source.mac,
    dstMac: dstMac,
    srcIp: source.ip,
    dstIp: nextHopIp,
    ttl: 1,
    length: 42,
    info: `${nextHopIp} is at ${dstMac} (${isLocal ? 'Entrega directa LAN' : 'Salto por Gateway'})`,
    status: 'ok',
    layer2Detail: `Ethernet II, Src: ${source.mac} (${source.name}), Dst: ${dstMac} (${isLocal ? 'Host Destino' : router.name})`,
    layer3Detail: `Resolución ARP completada: el próximo salto IPv4 (${nextHopIp}) tiene MAC ${dstMac}.`,
    layer4Detail: `Nota didáctica: Cuando el destino es externo, la MAC destino de la trama Ethernet es la del Router (${router.mac}), mientras que la IP destino sigue siendo ${targetIp}.`,
  });

  if (protocol === 'DNS') {
    packets.push({
      id: `${baseId}-dns-q`,
      seq: 2,
      timeOffsetMs: 2.1,
      protocol: 'DNS',
      srcMac: source.mac,
      dstMac: dstMac,
      srcIp: source.ip,
      dstIp: targetIp,
      ttl: 64,
      length: 74,
      info: `Standard query 0x8f2a A ${domainQuery || 'www.unfantasmaenelsistema.com'}`,
      status: reachResult.reachable ? 'ok' : 'error',
      layer2Detail: `Ethernet II, Src: ${source.mac}, Dst: ${dstMac}`,
      layer3Detail: `Internet Protocol Version 4, Src: ${source.ip}, Dst: ${targetIp} (Servidor DNS)`,
      layer4Detail: `User Datagram Protocol (UDP), Src Port: 54122, Dst Port: 53 (Domain Name System)`,
    });

    if (reachResult.reachable && isValidDnsServer(targetIp, router)) {
      const resolved = resolveDomain(domainQuery || '');
      packets.push({
        id: `${baseId}-dns-r`,
        seq: 3,
        timeOffsetMs: 14.8,
        protocol: 'DNS',
        srcMac: dstMac,
        dstMac: source.mac,
        srcIp: targetIp,
        dstIp: source.ip,
        ttl: 56,
        length: 90,
        info: resolved
          ? `Standard query response 0x8f2a A ${domainQuery} -> ${resolved}`
          : `Standard query response 0x8f2a No such name A ${domainQuery}`,
        status: resolved ? 'ok' : 'warn',
        layer2Detail: `Ethernet II, Src: ${dstMac}, Dst: ${source.mac}`,
        layer3Detail: `Internet Protocol Version 4, Src: ${targetIp}, Dst: ${source.ip}`,
        layer4Detail: resolved
          ? `DNS Answer: Registro Tipo A para ${domainQuery} = ${resolved} (TTL 3600s)`
          : `DNS Answer: RCODE 3 (NXDOMAIN). El servidor funciona, pero el nombre ${domainQuery} no existe.`,
      });
    } else {
      packets.push({
        id: `${baseId}-dns-err`,
        seq: 3,
        timeOffsetMs: 2000.0,
        protocol: 'DNS',
        srcMac: source.mac,
        dstMac: dstMac,
        srcIp: source.ip,
        dstIp: targetIp,
        ttl: 64,
        length: 74,
        info: `[DNS Timeout] Sin respuesta UDP/53 desde ${targetIp} (${reachResult.reason})`,
        status: 'error',
        layer2Detail: `Ethernet II, Src: ${source.mac}, Dst: ${dstMac}`,
        layer3Detail: `IPv4 Src: ${source.ip} -> Dst: ${targetIp}`,
        layer4Detail: `El servidor ${targetIp} no tiene servicio DNS activo o no existe ruta IP válida.`,
      });
    }
    return packets;
  }

  // ICMP or HTTP
  packets.push({
    id: `${baseId}-req`,
    seq: 2,
    timeOffsetMs: 1.5,
    protocol,
    srcMac: source.mac,
    dstMac: dstMac,
    srcIp: source.ip,
    dstIp: targetIp,
    ttl: 64,
    length: 74,
    info:
      protocol === 'HTTP'
        ? `GET / HTTP/1.1 (Host: ${domainQuery || targetIp})`
        : `Echo (ping) request id=0x0001, seq=1/256, ttl=64`,
    status: reachResult.reachable ? 'ok' : 'warn',
    layer2Detail: `Ethernet II, Src: ${source.mac} (${source.name}), Dst: ${dstMac} (${isLocal ? 'Destino Local' : `Gateway ${router.name}`})`,
    layer3Detail: `IPv4, Src: ${source.ip} (Red calculada: ${getNetworkAddress(source.ip, source.mask)}/${maskToCidr(source.mask)}), Dst: ${targetIp}`,
    layer4Detail:
      protocol === 'HTTP'
        ? `Transmission Control Protocol (TCP), Dst Port: 80/443 (HTTP/HTTPS)`
        : `Internet Control Message Protocol (ICMP Tipo 8: Echo Request)`,
  });

  if (reachResult.reachable && reachResult.viaRouterHairpin) {
    packets.push({
      id: `${baseId}-redirect`,
      seq: 3,
      timeOffsetMs: 1.9,
      protocol: 'ICMP',
      srcMac: router.mac,
      dstMac: source.mac,
      srcIp: router.lanIp,
      dstIp: source.ip,
      ttl: 64,
      length: 70,
      info: `Redirect (Redirect for host) — usa ${targetIp} directamente`,
      status: 'warn',
      layer2Detail: `Ethernet II, Src: ${router.mac} (${router.name}), Dst: ${source.mac} (${source.name})`,
      layer3Detail: `ICMP Tipo 5 (Redirect): el router reenvía el paquete por la misma interfaz LAN por la que entró y avisa de que el destino está en el mismo segmento.`,
      layer4Detail: `Síntoma típico de una máscara mal configurada: el tráfico funciona, pero da un rodeo innecesario por el router.`,
    });
  }

  if (reachResult.reachable) {
    packets.push({
      id: `${baseId}-rep`,
      seq: 3,
      timeOffsetMs: isLocal ? 2.4 : 15.6,
      protocol,
      srcMac: dstMac,
      dstMac: source.mac,
      srcIp: targetIp,
      dstIp: source.ip,
      ttl: isLocal ? 64 : 56,
      length: 74,
      info:
        protocol === 'HTTP'
          ? `HTTP/1.1 200 OK (text/html; charset=utf-8)`
          : `Echo (ping) reply id=0x0001, seq=1/256, ttl=${isLocal ? 64 : 56}`,
      status: 'ok',
      layer2Detail: `Ethernet II, Src: ${dstMac}, Dst: ${source.mac} (${source.name})`,
      layer3Detail: `IPv4, Src: ${targetIp}, Dst: ${source.ip}, TTL=${isLocal ? 64 : 56}`,
      layer4Detail:
        protocol === 'HTTP'
          ? `Respuesta HTTP 200 OK recibida correctamente.`
          : `ICMP Tipo 0 (Echo Reply): Ruta de ida y vuelta verificada sin pérdida de paquetes.`,
    });
  } else {
    packets.push({
      id: `${baseId}-fail`,
      seq: 3,
      timeOffsetMs: 2000.0,
      protocol: 'ICMP',
      srcMac: dstMac,
      dstMac: source.mac,
      srcIp: reachResult.errorReporterIp || targetIp,
      dstIp: source.ip,
      ttl: 64,
      length: 70,
      info: `[Fallo de Entrega] ${reachResult.reason}`,
      status: 'error',
      layer2Detail: `Trama descartada o expirada en ${reachResult.failedAtNodeId || 'la ruta'}`,
      layer3Detail: `Causa de Capa 3: ${reachResult.reason}`,
      layer4Detail: `ICMP Error / Request Timed Out (100% paquetes perdidos).`,
    });
  }

  return packets;
}

/**
 * Simulates packet routing between a source host and a target IP or hostname,
 * returning both realistic CLI text output and a PacketTrace (with Wireshark PDUs).
 */
export function executeTerminalCommand(
  rawCommand: string,
  sourceHost: HostNode,
  allHosts: HostNode[],
  router: RouterConfig
): {
  output: string[];
  status: 'ok' | 'warn' | 'error' | 'info';
  trace?: PacketTrace;
} {
  const trimmed = rawCommand.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);

  const sourceHealth = analyzeHostHealth(sourceHost, allHosts, router);

  if (!cmd) {
    return { output: [], status: 'info' };
  }

  // HELP
  if (cmd === 'help' || cmd === '?') {
    return {
      status: 'info',
      output: [
        'Comandos de diagnóstico disponibles en NetGhost CLI:',
        '  ipconfig [/all | /flushdns] Muestra la configuración TCP/IP del equipo activo',
        '  ping <ip | dominio | host>  Envía paquetes ICMP Echo para comprobar conectividad',
        '  tracert <ip | dominio>      Traza la ruta de saltos (routers) hasta el destino',
        '  nslookup <dominio> [dns]    Consulta al servidor DNS la IP de un nombre de dominio',
        '  curl <url | ip>             Realiza una petición HTTP/HTTPS de prueba desde consola',
        '  arp -a                      Muestra la tabla de caché ARP (IP <-> Dirección MAC)',
        '  route print | netstat -rn   Muestra la tabla de enrutamiento local IPv4',
        '  hostname | whoami           Muestra el identificador del equipo y sesión activa',
        '  cls | clear                 Limpia el historial de la consola',
      ],
    };
  }

  // HOSTNAME / WHOAMI
  if (cmd === 'hostname') {
    return {
      status: 'info',
      output: [`${sourceHost.name}.lan.local`],
    };
  }
  if (cmd === 'whoami') {
    return {
      status: 'info',
      output: [`lan\\admin-${sourceHost.name.toLowerCase()} (${sourceHost.userLabel})`],
    };
  }

  // IPCONFIG / IFCONFIG
  if (cmd === 'ipconfig' || cmd === 'ifconfig' || cmd === 'ip') {
    if (args.includes('/flushdns')) {
      return {
        status: 'ok',
        output: [
          'Configuración IP de Windows',
          '',
          'Se vació correctamente la caché de resolución de DNS.',
        ],
      };
    }

    const showAll =
      args.includes('/all') || args.includes('-a') || args.includes('a');
    const lines = [
      `Configuración IP de Windows (${sourceHost.name} - ${sourceHost.userLabel})`,
      '',
      'Adaptador de Ethernet Ethernet0:',
      '   Sufijo DNS específico para la conexión. . : lan.local',
    ];
    if (showAll) {
      lines.push(
        `   Descripción . . . . . . . . . . . . . . . : Intel(R) PRO/1000 MT Network Connection`,
        `   Dirección física (MAC). . . . . . . . . . : ${sourceHost.mac}`,
        `   DHCP habilitado . . . . . . . . . . . . . : ${sourceHost.ip.startsWith('169.254.') ? 'Sí (Fallo DHCP -> Autoconfiguración APIPA)' : 'No (IP Estática)'}`
      );
    }
    lines.push(
      `   Dirección IPv4. . . . . . . . . . . . . . : ${sourceHost.ip}${
        sourceHealth.detectedFaults.includes('DUPLICATE_IP')
          ? ' (Duplicada / Conflicto ARP)'
          : sourceHost.ip.startsWith('169.254.')
          ? ' (Dirección APIPA sin enlace)'
          : showAll
          ? ' (Preferido)'
          : ''
      }`,
      `   Máscara de subred . . . . . . . . . . . . : ${sourceHost.mask} (/${sourceHealth.cidr})`,
      `   Puerta de enlace predeterminada . . . . . : ${sourceHost.gateway || '(Sin configurar)'}`
    );
    if (showAll) {
      lines.push(
        `   Servidores DNS. . . . . . . . . . . . . . : ${sourceHost.dns}`,
        `   Red calculada por el host . . . . . . . . : ${sourceHealth.networkAddress}/${sourceHealth.cidr}`,
        `   Rango de hosts útiles . . . . . . . . . . : ${sourceHealth.hostRange}`,
        `   Dirección de Broadcast. . . . . . . . . . : ${sourceHealth.broadcastAddress}`
      );
    } else {
      lines.push(
        `   Servidor DNS configurado. . . . . . . . . : ${sourceHost.dns}`,
        '   (Consejo: usa "ipconfig /all" para ver dirección MAC y cálculo de subred)'
      );
    }

    return {
      status: 'info',
      output: lines,
    };
  }

  // ARP
  if (cmd === 'arp') {
    if (args.includes('-d')) {
      return {
        status: 'info',
        output: ['Se ha vaciado la caché ARP de la interfaz Ethernet0.'],
      };
    }

    const lines = [
      `Interfaz: ${sourceHost.ip} --- 0x2`,
      '  Dirección de Internet      Dirección física      Tipo',
    ];

    for (const h of allHosts) {
      if (h.id === sourceHost.id) continue;
      if (isSameSubnet(sourceHost.ip, h.ip, sourceHost.mask)) {
        lines.push(
          `  ${h.ip.padEnd(26, ' ')} ${h.mac.toLowerCase().padEnd(21, ' ')} dinámico`
        );
      }
    }

    if (isSameSubnet(sourceHost.ip, router.lanIp, sourceHost.mask)) {
      lines.push(
        `  ${router.lanIp.padEnd(26, ' ')} ${router.mac.toLowerCase().padEnd(21, ' ')} dinámico`
      );
    }

    lines.push(
      `  ${sourceHealth.broadcastAddress.padEnd(26, ' ')} ff-ff-ff-ff-ff-ff     estático`
    );

    if (sourceHealth.detectedFaults.includes('DUPLICATE_IP')) {
      const dupPeers = allHosts.filter(
        (h) => h.id !== sourceHost.id && h.ip === sourceHost.ip
      );
      for (const dup of dupPeers) {
        lines.push(
          `  [!] ALERTA ARP: La IP ${sourceHost.ip} responde con dos MACs (${sourceHost.mac} y ${dup.mac})`
        );
      }
      if (sourceHost.ip === router.lanIp) {
        lines.push(
          `  [!] ALERTA ARP: La IP ${sourceHost.ip} colisiona con la interfaz LAN del Router (${router.mac})`
        );
      }
    }

    return {
      status: sourceHealth.detectedFaults.includes('DUPLICATE_IP')
        ? 'warn'
        : 'info',
      output: lines,
    };
  }

  // ROUTE PRINT / NETSTAT -RN
  if (cmd === 'route' || cmd === 'netstat') {
    const netAddr = getNetworkAddress(sourceHost.ip, sourceHost.mask);
    const gwReachableInMask = isSameSubnet(
      sourceHost.ip,
      sourceHost.gateway,
      sourceHost.mask
    );
    const lines = [
      '===========================================================================',
      'Tabla de rutas activas IPv4:',
      'Destino de red        Máscara de red   Puerta de enlace       Interfaz  Métrica',
      gwReachableInMask
        ? `          0.0.0.0          0.0.0.0    ${sourceHost.gateway.padStart(15, ' ')}  ${sourceHost.ip.padStart(15, ' ')}     25`
        : `          0.0.0.0          0.0.0.0    [INALCANZABLE: ${sourceHost.gateway} fuera de ${netAddr}/${sourceHealth.cidr}]`,
      `${netAddr.padStart(17, ' ')}  ${sourceHost.mask.padStart(15, ' ')}         En vínculo  ${sourceHost.ip.padStart(15, ' ')}    281`,
      `${sourceHost.ip.padStart(17, ' ')}  255.255.255.255         En vínculo  ${sourceHost.ip.padStart(15, ' ')}    281`,
      '===========================================================================',
    ];
    return {
      status: gwReachableInMask ? 'info' : 'warn',
      output: lines,
    };
  }

  // CURL (HTTP CLI test)
  if (cmd === 'curl') {
    const targetUrl = args.find((a) => !a.startsWith('-')) || '';
    if (!targetUrl) {
      return {
        status: 'warn',
        output: [
          'Uso: curl <url | dirección_IP>',
          'Ejemplo: curl https://www.unfantasmaenelsistema.com',
          'Ejemplo por IP directa: curl http://185.199.108.153',
        ],
      };
    }
    const httpSim = simulateHttpBrowserRequest(
      targetUrl,
      sourceHost,
      allHosts,
      router
    );
    return {
      status: httpSim.ok ? 'ok' : 'error',
      output: httpSim.cliLines,
      trace: httpSim.trace,
    };
  }

  // NSLOOKUP
  if (cmd === 'nslookup' || cmd === 'dig' || cmd === 'host') {
    const queryArg = args[0]?.toLowerCase();
    const customDnsArg = args[1];

    if (!queryArg) {
      return {
        status: 'warn',
        output: [
          'Uso: nslookup <dominio> [servidor_dns_opcional]',
          'Ejemplo: nslookup www.unfantasmaenelsistema.com',
          'Ejemplo con DNS alternativo: nslookup www.unfantasmaenelsistema.com 8.8.8.8',
        ],
      };
    }

    const dnsToUse = customDnsArg ? customDnsArg.trim() : sourceHost.dns.trim();
    const pingCheckToDns = simulateIpReachability(
      sourceHost,
      dnsToUse,
      allHosts,
      router
    );

    const dnsIsWorkingServer = isValidDnsServer(dnsToUse, router);
    const cleanDomain = queryArg
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    const packets = buildCapturedPackets(
      sourceHost,
      dnsToUse,
      'DNS',
      pingCheckToDns,
      allHosts,
      router,
      cleanDomain
    );

    if (!pingCheckToDns.reachable || !dnsIsWorkingServer) {
      return {
        status: 'error',
        output: [
          `Servidor:  UnKnown`,
          `Address:  ${dnsToUse}`,
          '',
          `*** Tiempo de espera agotado en la solicitud a ${dnsToUse} (2 segundos).`,
          !pingCheckToDns.reachable
            ? `Causa de red: No hay ruta IP válida hacia el servidor DNS ${dnsToUse} (${pingCheckToDns.reason}).`
            : `Causa DNS: El host ${dnsToUse} no responde en el puerto UDP/53 (Servidor DNS inexistente o inactivo).`,
        ],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: queryArg,
          resolvedIp: dnsToUse,
          protocol: 'DNS',
          pathNodeIds: pingCheckToDns.pathNodeIds,
          failedAtNodeId: pingCheckToDns.failedAtNodeId || 'ROUTER',
          status: 'dns_error',
          summary: `Fallo al consultar DNS ${dnsToUse} para ${cleanDomain}`,
          packets,
        },
      };
    }

    const resolvedIp = resolveDomain(cleanDomain);

    const dnsServerName =
      dnsToUse === router.lanIp
        ? `router.lan.local (${router.lanIp})`
        : VALID_PUBLIC_DNS[dnsToUse] || 'dns-resolver.net';

    if (!resolvedIp) {
      return {
        status: 'warn',
        output: [
          `Servidor:  ${dnsServerName}`,
          `Address:  ${dnsToUse}`,
          '',
          `*** ${dnsServerName} no puede encontrar ${cleanDomain}: Non-existent domain (NXDOMAIN)`,
          '[El servidor DNS funciona: es el nombre el que no existe. Revisa cómo está escrito.]',
        ],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: cleanDomain,
          protocol: 'DNS',
          pathNodeIds: pingCheckToDns.pathNodeIds,
          status: 'dns_error',
          summary: `NXDOMAIN: ${cleanDomain} no existe (respuesta de ${dnsToUse})`,
          packets,
        },
      };
    }

    return {
      status: 'ok',
      output: [
        `Servidor:  ${dnsServerName}`,
        `Address:  ${dnsToUse}#53`,
        '',
        'Respuesta no autoritativa:',
        `Nombre:  ${cleanDomain}`,
        `Address: ${resolvedIp}`,
      ],
      trace: {
        id: `trace-${Date.now()}`,
        timestamp: Date.now(),
        sourceId: sourceHost.id,
        targetInput: cleanDomain,
        resolvedIp,
        protocol: 'DNS',
        pathNodeIds: pingCheckToDns.pathNodeIds,
        status: 'success',
        summary: `DNS ${dnsToUse} resolvió ${cleanDomain} -> ${resolvedIp}`,
        packets,
      },
    };
  }

  // PING
  if (cmd === 'ping') {
    const targetTokens = args.filter(
      (a) => !a.startsWith('-') && !/^\d+$/.test(a)
    );
    const targetRaw = targetTokens[0] || args[args.length - 1];

    if (!targetRaw) {
      return {
        status: 'warn',
        output: [
          'Uso: ping <dirección_IP | nombre_de_host | dominio>',
          'Ejemplos:',
          `  ping ${router.lanIp}                        (Probar puerta de enlace / Router)`,
          '  ping 8.8.8.8                            (Probar salida directa a Internet por IP)',
          '  ping www.unfantasmaenelsistema.com      (Probar resolución DNS + salida a Internet)',
        ],
      };
    }

    const matchedLocalHost = allHosts.find(
      (h) =>
        h.name.toLowerCase() === targetRaw.toLowerCase() ||
        h.id.toLowerCase() === targetRaw.toLowerCase()
    );
    const matchedRouter =
      targetRaw.toLowerCase() === 'router' ||
      targetRaw.toLowerCase() === router.name.toLowerCase();

    let targetIp = targetRaw;
    let displayLabel = targetRaw;

    if (matchedLocalHost) {
      targetIp = matchedLocalHost.ip;
      displayLabel = `${matchedLocalHost.name} [${targetIp}]`;
    } else if (matchedRouter) {
      targetIp = router.lanIp;
      displayLabel = `${router.name} [${targetIp}]`;
    } else if (!isValidIp(targetRaw)) {
      const cleanDomain = cleanDomainInput(targetRaw);
      const dnsReachability = simulateIpReachability(
        sourceHost,
        sourceHost.dns,
        allHosts,
        router
      );
      const dnsValid = isValidDnsServer(sourceHost.dns, router);
      const dnsPackets = buildCapturedPackets(
        sourceHost,
        sourceHost.dns,
        'DNS',
        dnsReachability,
        allHosts,
        router,
        cleanDomain
      );

      if (!dnsReachability.reachable || !dnsValid) {
        return {
          status: 'error',
          output: [
            `La solicitud de ping no pudo encontrar el host ${cleanDomain}. Compruebe el nombre y vuelva a intentarlo.`,
            `[Diagnóstico: El servidor DNS configurado (${sourceHost.dns}) no responde o es inalcanzable]`,
          ],
          trace: {
            id: `trace-${Date.now()}`,
            timestamp: Date.now(),
            sourceId: sourceHost.id,
            targetInput: cleanDomain,
            protocol: 'DNS',
            pathNodeIds: dnsReachability.pathNodeIds,
            failedAtNodeId: dnsReachability.failedAtNodeId || 'ROUTER',
            status: 'dns_error',
            summary: `Fallo DNS al resolver ${cleanDomain} mediante ${sourceHost.dns}`,
            packets: dnsPackets,
          },
        };
      }

      const resolvedPing = resolveDomain(cleanDomain);
      if (!resolvedPing) {
        return {
          status: 'error',
          output: [
            `La solicitud de ping no pudo encontrar el host ${cleanDomain}. Compruebe el nombre y vuelva a intentarlo.`,
            `[El servidor DNS ${sourceHost.dns} responde, pero el nombre no existe (NXDOMAIN)]`,
          ],
          trace: {
            id: `trace-${Date.now()}`,
            timestamp: Date.now(),
            sourceId: sourceHost.id,
            targetInput: cleanDomain,
            protocol: 'DNS',
            pathNodeIds: dnsReachability.pathNodeIds,
            status: 'dns_error',
            summary: `NXDOMAIN: ${cleanDomain} no existe`,
            packets: dnsPackets,
          },
        };
      }
      targetIp = resolvedPing;
      displayLabel = `${cleanDomain} [${targetIp}]`;
    }

    const result = simulateIpReachability(
      sourceHost,
      targetIp,
      allHosts,
      router
    );
    const packets = buildCapturedPackets(
      sourceHost,
      targetIp,
      'ICMP',
      result,
      allHosts,
      router
    );

    if (result.status === 'conflict') {
      return {
        status: 'error',
        output: [
          `Haciendo ping a ${displayLabel} con 32 bytes de datos:`,
          `Respuesta desde ${sourceHost.ip}: Conflicto de dirección IP detectado en la interfaz Ethernet0.`,
          `Tiempo de espera agotado para esta solicitud.`,
          `Respuesta desde ${targetIp}: bytes=32 tiempo=2ms TTL=64 (Colisión ARP en ${sourceHost.ip})`,
          `Tiempo de espera agotado para esta solicitud.`,
          '',
          `Estadísticas de ping para ${targetIp}:`,
          '    Paquetes: enviados = 4, recibidos = 1, perdidos = 3 (75% perdidos),',
        ],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: result.pathNodeIds,
          failedAtNodeId: result.failedAtNodeId,
          status: 'conflict',
          summary: result.reason,
          packets,
        },
      };
    }

    if (!result.reachable) {
      const replyLines =
        result.status === 'unreachable'
          ? [
              `Respuesta desde ${result.errorReporterIp || sourceHost.ip}: Host de destino inaccesible.`,
              `Respuesta desde ${result.errorReporterIp || sourceHost.ip}: Host de destino inaccesible.`,
              `Respuesta desde ${result.errorReporterIp || sourceHost.ip}: Host de destino inaccesible.`,
              `Respuesta desde ${result.errorReporterIp || sourceHost.ip}: Host de destino inaccesible.`,
            ]
          : [
              'Tiempo de espera agotado para esta solicitud.',
              'Tiempo de espera agotado para esta solicitud.',
              'Tiempo de espera agotado para esta solicitud.',
              'Tiempo de espera agotado para esta solicitud.',
            ];

      return {
        status: 'error',
        output: [
          `Haciendo ping a ${displayLabel} con 32 bytes de datos:`,
          ...replyLines,
          '',
          `Estadísticas de ping para ${targetIp}:`,
          `    Paquetes: enviados = 4, recibidos = 0, perdidos = 4 (100% perdidos),`,
          `    [Detalle técnico: ${result.reason}]`,
        ],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: result.pathNodeIds,
          failedAtNodeId: result.failedAtNodeId,
          status: result.status,
          summary: result.reason,
          packets,
        },
      };
    }

    const isWan = !isSameSubnet(targetIp, router.lanIp, router.lanMask);
    const baseMs = isWan ? 14 : 1;
    const ttl = isWan ? 56 : 64;

    return {
      status: 'ok',
      output: [
        `Haciendo ping a ${displayLabel} con 32 bytes de datos:`,
        `Respuesta desde ${targetIp}: bytes=32 tiempo=${baseMs}ms TTL=${ttl}`,
        `Respuesta desde ${targetIp}: bytes=32 tiempo=${baseMs + 1}ms TTL=${ttl}`,
        `Respuesta desde ${targetIp}: bytes=32 tiempo=${baseMs}ms TTL=${ttl}`,
        `Respuesta desde ${targetIp}: bytes=32 tiempo=${baseMs}ms TTL=${ttl}`,
        '',
        `Estadísticas de ping para ${targetIp}:`,
        '    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos),',
        'Tiempos aproximados de ida y vuelta en milisegundos:',
        `    Mínimo = ${baseMs}ms, Máximo = ${baseMs + 1}ms, Media = ${baseMs}ms`,
      ],
      trace: {
        id: `trace-${Date.now()}`,
        timestamp: Date.now(),
        sourceId: sourceHost.id,
        targetInput: targetRaw,
        resolvedIp: targetIp,
        protocol: 'ICMP',
        pathNodeIds: result.pathNodeIds,
        status: 'success',
        summary: `Conectividad verificada desde ${sourceHost.name} hacia ${targetIp}`,
        packets,
      },
    };
  }

  // TRACERT / TRACEROUTE
  if (cmd === 'tracert' || cmd === 'traceroute') {
    const targetRaw = args[0];
    if (!targetRaw) {
      return {
        status: 'warn',
        output: [
          'Uso: tracert <dirección_IP | dominio>',
          'Ejemplo: tracert 8.8.8.8',
          'Ejemplo: tracert www.unfantasmaenelsistema.com',
        ],
      };
    }

    let targetIp = targetRaw;
    let displayHeader = targetRaw;

    if (!isValidIp(targetRaw)) {
      const cleanDomain = targetRaw
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
      const dnsCheck = simulateIpReachability(
        sourceHost,
        sourceHost.dns,
        allHosts,
        router
      );
      const dnsPackets = buildCapturedPackets(
        sourceHost,
        sourceHost.dns,
        'DNS',
        dnsCheck,
        allHosts,
        router,
        cleanDomain
      );

      if (!dnsCheck.reachable || !isValidDnsServer(sourceHost.dns, router)) {
        return {
          status: 'error',
          output: [
            `No se puede resolver el nombre del sistema de destino ${cleanDomain}.`,
            `[El servidor DNS configurado (${sourceHost.dns}) no respondió a la consulta]`,
          ],
          trace: {
            id: `trace-${Date.now()}`,
            timestamp: Date.now(),
            sourceId: sourceHost.id,
            targetInput: cleanDomain,
            protocol: 'DNS',
            pathNodeIds: dnsCheck.pathNodeIds,
            failedAtNodeId: dnsCheck.failedAtNodeId,
            status: 'dns_error',
            summary: `tracert abortado: fallo DNS (${sourceHost.dns})`,
            packets: dnsPackets,
          },
        };
      }
      const resolvedTrace = resolveDomain(cleanDomain);
      if (!resolvedTrace) {
        return {
          status: 'error',
          output: [
            `No se puede resolver el nombre del sistema de destino ${cleanDomain}.`,
            `[El servidor DNS ${sourceHost.dns} responde, pero el nombre no existe (NXDOMAIN)]`,
          ],
          trace: {
            id: `trace-${Date.now()}`,
            timestamp: Date.now(),
            sourceId: sourceHost.id,
            targetInput: cleanDomain,
            protocol: 'DNS',
            pathNodeIds: dnsCheck.pathNodeIds,
            status: 'dns_error',
            summary: `tracert abortado: ${cleanDomain} no existe (NXDOMAIN)`,
            packets: dnsPackets,
          },
        };
      }
      targetIp = resolvedTrace;
      displayHeader = `${cleanDomain} [${targetIp}]`;
    }

    const reach = simulateIpReachability(
      sourceHost,
      targetIp,
      allHosts,
      router
    );
    const packets = buildCapturedPackets(
      sourceHost,
      targetIp,
      'ICMP',
      reach,
      allHosts,
      router
    );
    const lines = [
      `Traza a la dirección ${displayHeader}`,
      'sobre un máximo de 30 saltos:',
      '',
    ];

    if (isSameSubnet(sourceHost.ip, targetIp, sourceHost.mask)) {
      if (reach.reachable) {
        lines.push(
          `  1    <1 ms    <1 ms    <1 ms  ${targetIp} (Enlace directo LAN)`
        );
        lines.push('', 'Traza completa.');
      } else {
        lines.push(
          `  1  ${sourceHost.ip}  informes: Host de destino inaccesible.`,
          `     [${reach.reason}]`,
          '',
          'Traza completa.'
        );
      }
      return {
        status: reach.reachable ? 'ok' : 'error',
        output: lines,
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: reach.pathNodeIds,
          failedAtNodeId: reach.failedAtNodeId,
          status: reach.status,
          summary: reach.reason,
          packets,
        },
      };
    }

    const gwHop = simulateIpReachability(
      sourceHost,
      sourceHost.gateway,
      allHosts,
      router
    );
    const gwIsRouter = sourceHost.gateway.trim() === router.lanIp.trim();

    if (!gwHop.reachable || !gwIsRouter) {
      lines.push(
        `  1     *        *        *     Tiempo de espera agotado para esta solicitud. (Gateway ${sourceHost.gateway} no responde)`,
        `  2     *        *        *     Tiempo de espera agotado para esta solicitud.`,
        `  [Diagnóstico de ruta: ${reach.reason}]`
      );
      return {
        status: 'error',
        output: lines,
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: reach.pathNodeIds,
          failedAtNodeId: reach.failedAtNodeId,
          status: reach.status,
          summary: reach.reason,
          packets,
        },
      };
    }

    if (reach.viaRouterHairpin) {
      lines.push(
        `  1     1 ms     1 ms     1 ms  router.lan.local [${router.lanIp}]`,
        `  2    <1 ms    <1 ms    <1 ms  ${targetIp}`,
        '',
        'Traza completa.',
        `[Rodeo innecesario: ${targetIp} está en la misma LAN, pero con la máscara ${sourceHost.mask} este equipo lo envía al router]`
      );
      return {
        status: 'warn',
        output: lines,
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: reach.pathNodeIds,
          status: 'success',
          summary: reach.reason,
          packets,
        },
      };
    }

    if (!reach.reachable) {
      lines.push(
        `  1     1 ms     1 ms     1 ms  router.lan.local [${router.lanIp}]`,
        `  2     *        *        *     Tiempo de espera agotado para esta solicitud.`,
        `  3     *        *        *     Tiempo de espera agotado para esta solicitud.`,
        `  [Diagnóstico de ruta: ${reach.reason}]`
      );
      return {
        status: 'error',
        output: lines,
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: targetRaw,
          resolvedIp: targetIp,
          protocol: 'ICMP',
          pathNodeIds: reach.pathNodeIds,
          failedAtNodeId: reach.failedAtNodeId,
          status: reach.status,
          summary: reach.reason,
          packets,
        },
      };
    }

    lines.push(
      `  1     1 ms     1 ms     1 ms  router.lan.local [${router.lanIp}]`,
      `  2     6 ms     5 ms     6 ms  isp-edge-gw.red.es [${router.ispGateway}]`,
      `  3    11 ms    12 ms    11 ms  core-bcn-backbone.red.es [10.250.4.1]`,
      `  4    15 ms    14 ms    15 ms  ${targetIp}`,
      '',
      'Traza completa.'
    );

    return {
      status: 'ok',
      output: lines,
      trace: {
        id: `trace-${Date.now()}`,
        timestamp: Date.now(),
        sourceId: sourceHost.id,
        targetInput: targetRaw,
        resolvedIp: targetIp,
        protocol: 'ICMP',
        pathNodeIds: [sourceHost.id, 'SWITCH', router.id, 'INTERNET'],
        status: 'success',
        summary: `Ruta completada en 4 saltos hacia ${targetIp}`,
        packets,
      },
    };
  }

  return {
    status: 'warn',
    output: [
      `'${cmd}' no se reconoce como un comando interno o externo.`,
      'Escribe "help" para ver la lista de comandos de diagnóstico disponibles (ipconfig, ping, tracert, nslookup, curl, arp -a, route print, cls).',
    ],
  };
}

/**
 * Simulates an HTTP/HTTPS web browser or curl request from a host.
 */
export function simulateHttpBrowserRequest(
  rawUrl: string,
  sourceHost: HostNode,
  allHosts: HostNode[],
  router: RouterConfig
): {
  ok: boolean;
  errorCode?: string;
  title: string;
  subtitle: string;
  resolvedIp?: string;
  cliLines: string[];
  trace: PacketTrace;
} {
  const cleanHost = cleanDomainInput(rawUrl);

  // If cleanHost is not an IP, resolve via DNS first
  let targetIp = cleanHost;
  if (!isValidIp(cleanHost)) {
    const dnsReach = simulateIpReachability(
      sourceHost,
      sourceHost.dns,
      allHosts,
      router
    );
    const dnsValid = isValidDnsServer(sourceHost.dns, router);
    const dnsPackets = buildCapturedPackets(
      sourceHost,
      sourceHost.dns,
      'DNS',
      dnsReach,
      allHosts,
      router,
      cleanHost
    );

    if (!dnsReach.reachable || !dnsValid) {
      return {
        ok: false,
        errorCode: 'ERR_NAME_NOT_RESOLVED',
        title: `No se puede acceder a este sitio web (${cleanHost})`,
        subtitle: `No se ha podido encontrar la dirección IP del servidor de ${cleanHost} porque el servidor DNS configurado (${sourceHost.dns}) no responde. Prueba a navegar directamente por IP (http://185.199.108.153) para confirmar que el fallo es exclusivamente de DNS.`,
        cliLines: [
          `curl: (6) Could not resolve host: ${cleanHost}`,
          `[ERR_NAME_NOT_RESOLVED: El servidor DNS ${sourceHost.dns} no respondió a la consulta A]`,
        ],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: cleanHost,
          protocol: 'DNS',
          pathNodeIds: dnsReach.pathNodeIds,
          failedAtNodeId: dnsReach.failedAtNodeId || 'ROUTER',
          status: 'dns_error',
          summary: `Navegador bloqueado en resolución DNS (${sourceHost.dns}) para ${cleanHost}`,
          packets: dnsPackets,
        },
      };
    }

    const resolvedHttp = resolveDomain(cleanHost);
    if (!resolvedHttp) {
      return {
        ok: false,
        errorCode: 'DNS_PROBE_FINISHED_NXDOMAIN',
        title: `No se puede acceder a este sitio web (${cleanHost})`,
        subtitle: `El servidor DNS (${sourceHost.dns}) ha respondido que ${cleanHost} no existe. Comprueba si el nombre está bien escrito.`,
        cliLines: [`curl: (6) Could not resolve host: ${cleanHost}`, '[NXDOMAIN: el dominio no existe]'],
        trace: {
          id: `trace-${Date.now()}`,
          timestamp: Date.now(),
          sourceId: sourceHost.id,
          targetInput: cleanHost,
          protocol: 'DNS',
          pathNodeIds: dnsReach.pathNodeIds,
          status: 'dns_error',
          summary: `NXDOMAIN: ${cleanHost} no existe`,
          packets: dnsPackets,
        },
      };
    }
    targetIp = resolvedHttp;
  }

  const reach = simulateIpReachability(sourceHost, targetIp, allHosts, router);
  const packets = buildCapturedPackets(
    sourceHost,
    targetIp,
    'HTTP',
    reach,
    allHosts,
    router,
    cleanHost
  );

  if (!reach.reachable) {
    const errCode =
      reach.status === 'conflict'
        ? 'ERR_NETWORK_ACCESS_DENIED (IP_CONFLICT)'
        : reach.status === 'unreachable'
        ? 'ERR_ADDRESS_UNREACHABLE'
        : 'ERR_CONNECTION_TIMED_OUT';

    return {
      ok: false,
      errorCode: errCode,
      title: `La conexión con ${cleanHost} (${targetIp}) ha fallado`,
      subtitle: reach.reason,
      resolvedIp: targetIp,
      cliLines: [
        `Trying ${targetIp}:80...`,
        `curl: (7) Failed to connect to ${cleanHost} port 80: ${errCode}`,
        `[Causa de Capa 3: ${reach.reason}]`,
      ],
      trace: {
        id: `trace-${Date.now()}`,
        timestamp: Date.now(),
        sourceId: sourceHost.id,
        targetInput: cleanHost,
        resolvedIp: targetIp,
        protocol: 'HTTP',
        pathNodeIds: reach.pathNodeIds,
        failedAtNodeId: reach.failedAtNodeId,
        status: reach.status,
        summary: `Petición HTTP fallida hacia ${targetIp}: ${reach.reason}`,
        packets,
      },
    };
  }

  // Success! Determine which page was loaded
  const isRouterPage = targetIp === router.lanIp;
  const localServer = allHosts.find((h) => h.ip === targetIp);

  const pageTitle = isRouterPage
    ? `Panel de Administración RouterOS — ${router.name} (${router.lanIp})`
    : localServer
    ? `Recurso Compartido Intranet — ${localServer.name} (${localServer.userLabel})`
    : `Un Fantasma en el Sistema — Portal Educativo de Redes y Ciberseguridad (${targetIp})`;

  const pageSubtitle = isRouterPage
    ? `Interfaz LAN: ${router.lanIp}/${maskToCidr(router.lanMask)} | Estado WAN: Conectado (${router.wanIp}) | Reenvío DNS: ${router.dnsForwarder}`
    : localServer
    ? `Servicio SMB/HTTP local activo en ${localServer.ip} (${localServer.mac}). Acceso de red local verificado.`
    : `Conexión HTTP/2 200 OK establecida desde ${sourceHost.name} (${sourceHost.ip}) a través del Gateway ${router.lanIp}.`;

  return {
    ok: true,
    title: pageTitle,
    subtitle: pageSubtitle,
    resolvedIp: targetIp,
    cliLines: [
      `HTTP/1.1 200 OK`,
      `Server: NetGhost-Edge/2.4`,
      `Content-Type: text/html; charset=UTF-8`,
      `X-Resolved-IP: ${targetIp}`,
      '',
      `<!DOCTYPE html><html><head><title>${pageTitle}</title></head>`,
      `<body><h1>200 OK - ${pageTitle}</h1><p>${pageSubtitle}</p></body></html>`,
    ],
    trace: {
      id: `trace-${Date.now()}`,
      timestamp: Date.now(),
      sourceId: sourceHost.id,
      targetInput: cleanHost,
      resolvedIp: targetIp,
      protocol: 'HTTP',
      pathNodeIds: reach.pathNodeIds,
      status: 'success',
      summary: `HTTP 200 OK desde ${targetIp} (${cleanHost})`,
      packets,
    },
  };
}

/**
 * Core layer-2 / layer-3 reachability simulator between a source HostNode and any target IPv4 address.
 */
export function simulateIpReachability(
  source: HostNode,
  targetIp: string,
  allHosts: HostNode[],
  router: RouterConfig
): {
  reachable: boolean;
  status: 'success' | 'unreachable' | 'timeout' | 'conflict';
  reason: string;
  errorReporterIp?: string;
  pathNodeIds: string[];
  failedAtNodeId?: string;
  /** El router reenvió el paquete de vuelta a la misma LAN (máscara del origen demasiado larga). */
  viaRouterHairpin?: boolean;
} {
  const cleanTarget = targetIp.trim();

  if (!isValidIp(source.ip) || !isValidMask(source.mask)) {
    return {
      reachable: false,
      status: 'unreachable',
      reason: `El equipo origen (${source.name}) tiene un formato de IP o máscara inválido.`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id],
      failedAtNodeId: source.id,
    };
  }

  if (!isValidIp(cleanTarget)) {
    return {
      reachable: false,
      status: 'unreachable',
      reason: `Dirección IP de destino (${cleanTarget}) no válida.`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id],
      failedAtNodeId: source.id,
    };
  }

  if (cleanTarget === '127.0.0.1' || cleanTarget === source.ip.trim()) {
    const hasConflict =
      allHosts.some(
        (h) => h.id !== source.id && h.ip.trim() === source.ip.trim()
      ) || source.ip.trim() === router.lanIp.trim();
    if (hasConflict) {
      return {
        reachable: false,
        status: 'conflict',
        reason: `Colisión de dirección IP duplicada (${source.ip}) en la red local.`,
        pathNodeIds: [source.id, 'SWITCH'],
        failedAtNodeId: source.id,
      };
    }
    return {
      reachable: true,
      status: 'success',
      reason: 'Respuesta loopback / interfaz propia.',
      pathNodeIds: [source.id],
    };
  }

  const sourceHasConflict =
    allHosts.some(
      (h) => h.id !== source.id && h.ip.trim() === source.ip.trim()
    ) || source.ip.trim() === router.lanIp.trim();
  if (sourceHasConflict) {
    return {
      reachable: false,
      status: 'conflict',
      reason: `${source.name} sufre un conflicto de IP duplicada (${source.ip}) con otro dispositivo de la LAN.`,
      pathNodeIds: [source.id, 'SWITCH'],
      failedAtNodeId: 'SWITCH',
    };
  }

  if (!isHostIpUsableInSubnet(source.ip, source.mask)) {
    return {
      reachable: false,
      status: 'unreachable',
      reason: `La IP ${source.ip} coincide con la dirección de red o broadcast para la máscara ${source.mask}.`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id],
      failedAtNodeId: source.id,
    };
  }

  const targetIsLocalToSource = isSameSubnet(
    source.ip,
    cleanTarget,
    source.mask
  );

  if (targetIsLocalToSource) {
    if (cleanTarget === router.lanIp.trim()) {
      if (
        isSameSubnet(source.ip, router.lanIp, router.lanMask) &&
        isHostIpUsableInSubnet(source.ip, router.lanMask)
      ) {
        return {
          reachable: true,
          status: 'success',
          reason: `Comunicación directa LAN con ${router.name} (${router.lanIp}).`,
          pathNodeIds: [source.id, 'SWITCH', router.id],
        };
      } else {
        return {
          reachable: false,
          status: 'timeout',
          reason: `${source.name} envía el paquete al Router, pero el Router (${router.lanIp}/${maskToCidr(router.lanMask)}) descarta la respuesta porque ${source.ip} no pertenece a su subred o es inválida.`,
          pathNodeIds: [source.id, 'SWITCH', router.id],
          failedAtNodeId: router.id,
        };
      }
    }

    const targetHosts = allHosts.filter((h) => h.ip.trim() === cleanTarget);
    if (targetHosts.length === 0) {
      return {
        reachable: false,
        status: 'unreachable',
        reason: `Ningún equipo en el switch local responde al ARP para ${cleanTarget}.`,
        errorReporterIp: source.ip,
        pathNodeIds: [source.id, 'SWITCH'],
        failedAtNodeId: 'SWITCH',
      };
    }

    if (targetHosts.length > 1) {
      return {
        reachable: false,
        status: 'conflict',
        reason: `La IP de destino ${cleanTarget} está duplicada entre ${targetHosts.map((h) => h.name).join(' y ')}.`,
        pathNodeIds: [source.id, 'SWITCH', targetHosts[0].id],
        failedAtNodeId: targetHosts[0].id,
      };
    }

    const targetHost = targetHosts[0];
    if (
      isValidMask(targetHost.mask) &&
      isHostIpUsableInSubnet(targetHost.ip, targetHost.mask) &&
      isSameSubnet(targetHost.ip, source.ip, targetHost.mask)
    ) {
      return {
        reachable: true,
        status: 'success',
        reason: `Comunicación LAN directa entre ${source.name} y ${targetHost.name}.`,
        pathNodeIds: [source.id, 'SWITCH', targetHost.id],
      };
    } else {
      return {
        reachable: false,
        status: 'timeout',
        reason: `Asimetría de subred: ${source.name} (${source.mask}) alcanza a ${targetHost.name}, pero ${targetHost.name} (máscara ${targetHost.mask}) cree que ${source.ip} está en otra red y no puede devolver el paquete.`,
        pathNodeIds: [source.id, 'SWITCH', targetHost.id],
        failedAtNodeId: targetHost.id,
      };
    }
  }

  if (!isValidIp(source.gateway)) {
    return {
      reachable: false,
      status: 'unreachable',
      reason: `${source.name} necesita usar su puerta de enlace para llegar a ${cleanTarget}, pero no tiene una puerta de enlace válida (${source.gateway || 'vacía'}).`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id],
      failedAtNodeId: source.id,
    };
  }

  if (!isSameSubnet(source.ip, source.gateway, source.mask)) {
    return {
      reachable: false,
      status: 'unreachable',
      reason: `La puerta de enlace configurada (${source.gateway}) no pertenece a la subred de ${source.name} (${getNetworkAddress(source.ip, source.mask)}/${maskToCidr(source.mask)}). El paquete no puede salir del equipo.`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id],
      failedAtNodeId: source.id,
    };
  }

  if (source.gateway.trim() !== router.lanIp.trim()) {
    const gatewayIsAnotherHost = allHosts.find(
      (h) => h.ip.trim() === source.gateway.trim()
    );
    if (gatewayIsAnotherHost) {
      return {
        reachable: false,
        status: 'timeout',
        reason: `${source.name} envía su tráfico de Internet a ${gatewayIsAnotherHost.name} (${source.gateway}), que es un host normal sin enrutamiento WAN en lugar del Router (${router.lanIp}).`,
        errorReporterIp: source.gateway,
        pathNodeIds: [source.id, 'SWITCH', gatewayIsAnotherHost.id],
        failedAtNodeId: gatewayIsAnotherHost.id,
      };
    }
    return {
      reachable: false,
      status: 'unreachable',
      reason: `${source.name} intenta enviar el tráfico a la puerta de enlace ${source.gateway}, pero el Router real está en ${router.lanIp}. Nadie responde en ${source.gateway}.`,
      errorReporterIp: source.ip,
      pathNodeIds: [source.id, 'SWITCH'],
      failedAtNodeId: 'SWITCH',
    };
  }

  if (
    !isSameSubnet(source.ip, router.lanIp, router.lanMask) ||
    !isHostIpUsableInSubnet(source.ip, router.lanMask)
  ) {
    return {
      reachable: false,
      status: 'timeout',
      reason: `El paquete llega al Router (${router.lanIp}), pero el Router tiene máscara ${router.lanMask} y no reconoce a ${source.ip} como parte válida de su LAN.`,
      pathNodeIds: [source.id, 'SWITCH', router.id],
      failedAtNodeId: router.id,
    };
  }

  const lanPeers = allHosts.filter((h) => h.ip.trim() === cleanTarget);
  if (lanPeers.length > 1) {
    return {
      reachable: false,
      status: 'conflict',
      reason: `La IP de destino ${cleanTarget} está duplicada entre ${lanPeers.map((h) => h.name).join(' y ')}.`,
      pathNodeIds: [source.id, 'SWITCH', router.id, lanPeers[0].id],
      failedAtNodeId: lanPeers[0].id,
    };
  }
  const lanPeerAtTarget = lanPeers[0];
  if (lanPeerAtTarget) {
    // El origen cree que el destino está en otra red y lo manda al router; el router, que
    // sí lo tiene en su LAN, lo reenvía por la misma interfaz (y avisa con un ICMP Redirect).
    const peer = lanPeerAtTarget;
    const peerUsable =
      isValidMask(peer.mask) &&
      isHostIpUsableInSubnet(peer.ip, peer.mask) &&
      isSameSubnet(peer.ip, router.lanIp, router.lanMask);
    const peerRepliesDirect = peerUsable && isSameSubnet(peer.ip, source.ip, peer.mask);
    const peerRepliesViaRouter =
      peerUsable &&
      peer.gateway.trim() === router.lanIp.trim() &&
      isSameSubnet(peer.ip, router.lanIp, peer.mask);
    if (peerRepliesDirect || peerRepliesViaRouter) {
      return {
        reachable: true,
        status: 'success',
        reason: `${source.name} (máscara ${source.mask}) cree que ${peer.name} (${cleanTarget}) está en otra red y envía el paquete a su puerta de enlace. El router, que sí lo tiene en su LAN, lo reenvía por la misma interfaz y avisa con un ICMP Redirect: funciona, pero dando un rodeo.`,
        pathNodeIds: [source.id, 'SWITCH', router.id, peer.id],
        viaRouterHairpin: true,
      };
    }
    return {
      reachable: false,
      status: 'timeout',
      reason: `El router reenvía el paquete de ${source.name} hasta ${peer.name}, pero ${peer.name} (máscara ${peer.mask}, puerta de enlace ${peer.gateway}) no tiene un camino válido para devolver la respuesta.`,
      pathNodeIds: [source.id, 'SWITCH', router.id, peer.id],
      failedAtNodeId: peer.id,
    };
  }

  if (REACHABLE_WAN_IPS.has(cleanTarget)) {
    return {
      reachable: true,
      status: 'success',
      reason: `Tráfico enrutado correctamente a través del Gateway ${router.lanIp} hacia Internet (${cleanTarget}).`,
      pathNodeIds: [source.id, 'SWITCH', router.id, 'INTERNET'],
    };
  }

  return {
    reachable: false,
    status: 'timeout',
    reason: `El paquete salió a Internet a través de ${router.lanIp}, pero el host externo ${cleanTarget} no existe o no responde a ICMP.`,
    pathNodeIds: [source.id, 'SWITCH', router.id, 'INTERNET'],
    failedAtNodeId: 'INTERNET',
  };
}
