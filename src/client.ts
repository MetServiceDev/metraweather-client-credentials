import fetch from "isomorphic-fetch";

interface ClientCredentials {
	clientId: string;
	clientSecret: string;
};

interface OktaResponse {
	token_type: string;
	expires_in: number;
	access_token: string;
	scope: string;
}

let cachedJwt: string | undefined;
let refetchAt = -1;

const PRODUCTION_OKTA_ISSUER = 'https://metraweather.okta.com/oauth2/aus806w3t6ASnEeMm2p7';
const DEV_OKTA_ISSUER = 'https://dev-metraweather.oktapreview.com/oauth2/aust1sg19euC6lDvo0h7';
const fetchCredentials = async ({ clientId, clientSecret }: ClientCredentials): Promise<Response> => {
	
	const oktaUrl = process.env.DEV_ENVIRONMENT === 'true' ? DEV_OKTA_ISSUER : PRODUCTION_OKTA_ISSUER;
	const requestForm = new URLSearchParams();
	requestForm.append('grant_type', 'client_credentials');
	requestForm.append('scope', 'tier');
	const authorizationCredentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf-8').toString('base64');
	return fetch(`${oktaUrl}/v1/token`, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'cache-control': 'no-cache',
			'content-type': 'application/x-www-form-urlencoded',
			'Authorization': `Basic ${authorizationCredentials}`,
		},
		body: requestForm
	});
}

let requestInProcess: Promise<Response> | undefined;
const singletonFetchCredentials = async (clientCredentials: ClientCredentials): Promise<Response> => {
	if(requestInProcess) {
		return requestInProcess;
	}
	const request = fetchCredentials(clientCredentials);
	requestInProcess = request;
	await requestInProcess;
	requestInProcess = undefined;
	return request;
}

const TEN_MINUTES = 10 * 60 * 1000;
const setCachedJwt = (jwt: string | undefined) => {
	cachedJwt = jwt;
}
/**
 * Exchanges the client credentials for a JWT, and caches it until ten minutes before expiry.
 * Retries multiple times with an increasing back-off if the API returns an error (1 second per failed attempt).
 * 
 * @param clientCredentials - Your clientId/clientSecret
 * @param force - Forcibly refresh the token even if it is still valid, defaults to false
 * @param maxAttempts - The maximum amount of times to attempt fetching the token before throwing an error, defaults to 3.
 */
const getJwtFromClientCredentials = async (clientCredentials: ClientCredentials, force: boolean = false, maxAttempts: number = 3): Promise<string> => {
	if (!cachedJwt || Date.now() > refetchAt || force) {
		let succesfulResponse = false;
		let attempts = 1;
		let response = await singletonFetchCredentials(clientCredentials);
		while (!response.ok && attempts < maxAttempts) {
			response = await singletonFetchCredentials(clientCredentials);
			await new Promise((resolve) => setTimeout(resolve, attempts * 1000))
			attempts++;
		}
		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Unable to exchange credentials for token: ${response.status} - "${response.statusText}" - "${body}"`)
		}
		succesfulResponse = true;
		const oktaResponse = (await response.json()) as OktaResponse;
		cachedJwt = oktaResponse.access_token;
		refetchAt = Date.now() + (oktaResponse.expires_in * 1000) - TEN_MINUTES;
	}
	return cachedJwt;
}

export {
	getJwtFromClientCredentials,
	setCachedJwt
}