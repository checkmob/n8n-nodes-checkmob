import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class CheckmobApi implements ICredentialType {
	name = 'checkmobApi';
	displayName = 'Checkmob API';
	documentationUrl = 'https://api-integration.checkmob.com/index.html';
	icon = { light: 'file:checkmob.dark.svg', dark: 'file:checkmob.white.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: 'https://api-integration.checkmob.com',
		},
		{
			displayName: 'Login',
			name: 'login',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'Enter your login (username or email)',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'Enter your password',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
	];

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		const response = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/v2/token`,
			headers: { 'Content-Type': 'application/json', 'Accept-Language': 'pt-BR' },
			body: {
				login: credentials.login as string,
				senha: credentials.password as string,
			},
			json: true,
		})) as { token_acesso?: string; detalhe?: string; titulo?: string };

		if (!response?.token_acesso) {
			throw new Error(response?.detalhe ?? response?.titulo ?? 'Login failed. Please check your username and password.');
		}

		return { accessToken: response.token_acesso };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v2/usuarios/list',
			method: 'POST',
			body: { pagina: 1, por_pagina: 1 },
		},
	};
}
