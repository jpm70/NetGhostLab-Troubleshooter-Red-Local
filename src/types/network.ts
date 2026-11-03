export type DeviceRole = 'workstation' | 'laptop' | 'server' | 'printer';

export type FaultType =
  | 'NONE'
  | 'WRONG_GATEWAY'
  | 'INVALID_DNS'
  | 'DUPLICATE_IP'
  | 'WRONG_SUBNET_MASK'
  | 'WRONG_SUBNET_IP';

export interface HostNode {
  id: string;
  name: string;
  role: DeviceRole;
  userLabel: string;
  mac: string;
  ip: string;
  mask: string;
  gateway: string;
  dns: string;
}

export interface RouterConfig {
  id: string;
  name: string;
  lanIp: string;
  lanMask: string;
  wanIp: string;
  ispGateway: string;
  dnsForwarder: string;
  mac: string;
}

export interface ExpectedFault {
  hostId: string;
  faultType: FaultType;
  explanation: string;
}

export interface Scenario {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  ticketSender: string;
  symptomReport: string;
  learningObjective: string;
  router: RouterConfig;
  hosts: HostNode[];
  expectedFaults: ExpectedFault[];
  hints: string[];
  isRandom?: boolean;
}

export interface HostHealthReport {
  hostId: string;
  isValidFormat: boolean;
  detectedFaults: FaultType[];
  duplicateWithHostIds: string[];
  canReachLanPeers: boolean;
  canReachGateway: boolean;
  canReachInternetIp: boolean;
  canResolveDns: boolean;
  networkAddress: string;
  broadcastAddress: string;
  cidr: number;
  hostRange: string;
  summaryText: string;
}

export interface CapturedPacket {
  id: string;
  seq: number;
  timeOffsetMs: number;
  protocol: 'ARP' | 'ICMP' | 'DNS' | 'HTTP';
  srcMac: string;
  dstMac: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  length: number;
  info: string;
  status: 'ok' | 'warn' | 'error';
  layer2Detail: string;
  layer3Detail: string;
  layer4Detail: string;
}

export interface PacketTrace {
  id: string;
  timestamp: number;
  sourceId: string;
  targetInput: string;
  resolvedIp?: string;
  protocol: 'ICMP' | 'DNS' | 'ARP' | 'HTTP';
  pathNodeIds: string[];
  failedAtNodeId?: string;
  status: 'success' | 'unreachable' | 'timeout' | 'dns_error' | 'conflict';
  summary: string;
  packets: CapturedPacket[];
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string[];
  status: 'ok' | 'warn' | 'error' | 'info';
  timestamp: string;
}
