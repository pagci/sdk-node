/**
 * Raw HTTP response returned by any HttpClient implementation.
 * Headers keys are always lowercased for consistent access.
 */
export interface HttpClientResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}
/**
 * Abstract HTTP client interface.
 * Implementations can use node:https, fetch, undici, etc.
 */
export interface HttpClient {
    request(method: string, url: string, headers: Record<string, string>, body?: string, timeout?: number): Promise<HttpClientResponse>;
}
//# sourceMappingURL=HttpClient.d.ts.map