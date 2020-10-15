
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

const PRODUCTION_OKTA_ISSUER = 'https://metraweather.okta.com/oauth2/aus806w3t6ASnEeMm2p7/v1/token';
const DEV_OKTA_ISSUER = 'https://dev-metraweather.oktapreview.com/oauth2/aust1sg19euC6lDvo0h7';
const fetchCredentials = ({ clientId, clientSecret }: ClientCredentials) => {
	const oktaUrl = process.env.DEV_ENVIRONMENT === 'true' ? DEV_OKTA_ISSUER : PRODUCTION_OKTA_ISSUER;
	const requestForm = new FormData();
	requestForm.append('grant_type', 'client_credentials');
	requestForm.append('scope', 'tier');
	return fetch(`${oktaUrl}/v1/token`, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'cache-control': 'no-cache',
			'content-type': 'application/x-www-form-urlencoded',
			'Authorization': `Basic ${btoa(`${clientId}:${clientSecret})`)}`,
		},
		body: requestForm
	});
}

const TEN_MINUTES = 10 * 60 * 1000;
const setCachedJwt = (jwt: string | undefined) => {
	cachedJwt = jwt;
}
const getJwtFromClientCredentials = async (clientCredentials: ClientCredentials, maxAttempts: number = 3): Promise<string> => {
	if (!cachedJwt || Date.now() > refetchAt) {
		let succesfulResponse = false;
		let attempts = 1;
		let response = await fetchCredentials(clientCredentials);
		while (!response.ok && attempts < maxAttempts) {
			response = await fetchCredentials(clientCredentials);
			attempts++;
		}
		if (!response.ok) {
			throw new Error(`Unable to exchange credentials for token: ${response.status} - "${response.statusText}"`)
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