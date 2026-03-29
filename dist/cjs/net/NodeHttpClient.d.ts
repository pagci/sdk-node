import * as https from 'node:https';
import * as http from 'node:http';
import type { HttpClient, HttpClientResponse } from './HttpClient.js';
/**
 * Node.js native HTTPS client. Zero runtime dependencies.
 * Uses `node:https` with TCP keep-alive by default.
 */
export declare class NodeHttpClient implements HttpClient {
    private readonly agent;
    constructor(agent?: https.Agent | http.Agent);
    request(method: string, url: string, headers: Record<string, string>, body?: string, timeout?: number): Promise<HttpClientResponse>;
}
//# sourceMappingURL=NodeHttpClient.d.ts.map