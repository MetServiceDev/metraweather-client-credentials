# About
In order to use MetraWeather's APIs you must have a valid [JWT](https://jwt.io/) which you can get by calling our API with your client credentials.

This JavaScript library wraps that API and caches the token until ten minutes before expiry. It retries on failure and uses an increasing back-off on each failure.

# Other languages

This repo is mostly to show you how you could make this request, the code is open source and you are free to port it to whatever language you prefer.

It is making the equivalent call of the following cURL:
```
curl --location --request POST 'https://metraweather.okta.com/oauth2/aus806w3t6ASnEeMm2p7/v1/token' \
--header 'accept: application/json' \
--header 'cache-control: no-cache' \
--header 'content-type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic ...' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=tier'
```

[Postman](https://www.postman.com/) can import cURL and convert it to various code samples.

## Generating the Authorization header
The Authorization header scheme used by this API is ["Basic"](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization).

The basic steps are:
 1. Join the `client id` and `client secret` together with a colon (`clientId:clientSecret`)
 2. Base64 encode the value ([e.g., in JS](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa) `window.btoa('clientId:clientSecret');`) becomes `Y2xpZW50SWQ6Y2xpZW50U2VjcmV0`
 3. Prefix `Basic `, so if your clientId and clientSecret were `clientId` and `clientSecret` you'd end up with `Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0`

# Using
Add this project to your npm/yarn project with `yarn add @metservice/metraweather-client-credentials` or `npm install @metservice/metraweather-client-credentials`.

You can then use this library with:

```js
import { getJwtFromClientCredentials } from '@metservice/metraweather-client-credentials';

// Replace this with however you load in secure credentials, this may be from disk, environment variables, SSM/SecretsManager in AWS, etc.
const { clientId, clientSecret } = loadSecureCredentials();

const fetchDataFromApi = async () => {
	// You can call this as many times as you want, the token is cached until ten minutes before expiry.
	const token = await getJwtFromClientCredentials({
		clientId, 
		clientSecret
	});
	//Call a MetraWeather API with your token
}
```