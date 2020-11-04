import { getJwtFromClientCredentials, setCachedJwt } from '../client';
import fetch from "isomorphic-fetch";
import { resolve } from 'path';

jest.mock('isomorphic-fetch');

const mockFetch = (getResult: () => { access_token: string; expires_in: number; ok: boolean }, waitForResult: ((resolvePromise: () => void) => void) = (resolvePromise) => { resolvePromise() }) => {
	(fetch as jest.Mock).mockImplementation(() => {
		const { access_token, expires_in, ok } = getResult();
		return new Promise<Response>((resolve) => {
			waitForResult(() => resolve(({
				json: () =>
					Promise.resolve({
						token_type: 'abc',
						expires_in,
						access_token,
						scope: 'tier',
					}),
				headers: {
					get: () => null,
				},
				status: 'mockStatus',
				statusText: 'mockStatusText',
				ok,
			} as any) as Response));
		});
	});
};
describe('When asked for a JWT', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2020-02-01T00:49:24.042Z').valueOf());
		setCachedJwt(undefined);
	});
	afterEach(() => {
		jest.resetAllMocks();
	});
	it('should return the cached credentials', async () => {
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: true,
			};
		});
		const jwt = await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		mockFetch(() => {
			return {
				access_token: 'ghi',
				expires_in: 3600,
				ok: true,
			};
		});
		const jwtTwo = await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		expect(jwt).toEqual(jwtTwo);
		expect(jwtTwo).toEqual('def');
		expect(fetch).toHaveBeenCalledTimes(1);
	});
	it('should refetch the credentials if there is less ten minutes before the next expiry', async () => {
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: true,
			};
		});
		const jwt = await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2020-02-01T01:41:00.042Z').valueOf());
		mockFetch(() => {
			return {
				access_token: 'ghi',
				expires_in: 3600,
				ok: true,
			};
		});
		const jwtTwo = await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		expect(jwt).toEqual('def');
		expect(jwtTwo).toEqual('ghi');
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	it('should attempt to fetch up to 3 times', async () => {
		let count = 0;
		mockFetch(() => {
			count++;
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: count === 3 ? true : false,
			};
		});
		const jwt = await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		expect(count).toEqual(3);
		expect(jwt).toEqual('def');
	});
	it('should throw an error if it has not fetched after 3 times', () => {
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: false,
			};
		});
		expect(() => getJwtFromClientCredentials({ clientId: '', clientSecret: '' })).rejects.toThrowErrorMatchingInlineSnapshot(
			`"Unable to exchange credentials for token: mockStatus - \\"mockStatusText\\""`
		);
	});
	it('should use the correct environment', async () => {
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: true,
			};
		});
		await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		expect((fetch as jest.Mock).mock.calls[0][0]).toEqual('https://metraweather.okta.com/oauth2/aus806w3t6ASnEeMm2p7/v1/token');
		process.env.DEV_ENVIRONMENT = 'true';

		setCachedJwt(undefined);
		await getJwtFromClientCredentials({ clientId: '', clientSecret: '' });
		expect((fetch as jest.Mock).mock.calls[1][0]).toEqual('https://dev-metraweather.oktapreview.com/oauth2/aust1sg19euC6lDvo0h7/v1/token');
	});
	it('should set the credentials in the header correctly', async () => {
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: true,
			};
		});
		await getJwtFromClientCredentials({ clientId: 'abc', clientSecret: 'def' });
		expect((fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toEqual('Basic YWJjOmRlZg==');
	})

	it('should set only have one fetch active at a time', async () => {
		let finishFetch;
		mockFetch(() => {
			return {
				access_token: 'def',
				expires_in: 3600,
				ok: true,
			};
		}, (resolvePromise: () => void) => {
			finishFetch = resolvePromise
		});
		const resultOne = getJwtFromClientCredentials({ clientId: 'abc', clientSecret: 'def' });
		const resultTwo = getJwtFromClientCredentials({ clientId: 'abc', clientSecret: 'def' });
		expect(resultOne).toEqual(resultTwo);
	})
});
