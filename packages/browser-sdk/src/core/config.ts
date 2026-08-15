export interface SDKEvent {
  type: string;
  data: any;
  timestamp: string;
  session_id?: string;
  visitor_id?: string;
  url?: string;
  route?: string;
  title?: string;
}

export interface AWOConfig {
  siteKey: string;
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  maxRetries: number;
  sessionTimeout: number;
  enableClickTracking: boolean;
  enableNetworkTracking: boolean;
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  maskAttributes: string[];
  ignoreAttributes: string[];
  excludeRoutes: string[];
  excludeUrlPatterns: string[];
  debug: boolean;
  respectDoNotTrack: boolean;
  version?: string;
}

const DEFAULT_CONFIG: Omit<AWOConfig, 'siteKey' | 'endpoint'> = {
  batchSize: 10,
  flushInterval: 5000,
  maxQueueSize: 100,
  maxRetries: 3,
  sessionTimeout: 1800000,
  enableClickTracking: true,
  enableNetworkTracking: true,
  enableErrorTracking: true,
  enablePerformanceTracking: true,
  maskAttributes: ['data-monitor-mask'],
  ignoreAttributes: ['data-monitor-ignore'],
  excludeRoutes: [],
  excludeUrlPatterns: [],
  debug: false,
  respectDoNotTrack: true,
};

export function mergeConfig(userConfig: Partial<AWOConfig>): AWOConfig {
  if (!userConfig.siteKey) {
    throw new Error('AWO: siteKey is required');
  }
  return {
    ...DEFAULT_CONFIG,
    endpoint: userConfig.endpoint || 'https://api.adaptiveweb.com',
    ...userConfig,
  } as AWOConfig;
}
