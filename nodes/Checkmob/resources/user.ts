import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a user by ID', action: 'Get user' },
			{ name: 'List', value: 'list', description: 'List users', action: 'List users' },
			{ name: 'Locations', value: 'location', description: 'Get the recorded locations of a user', action: 'Get user locations' },
		],
		default: 'list',
	},
	{
		displayName: 'User ID',
		name: 'idUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['get', 'location'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['user'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
		options: [
			{
				displayName: 'Active',
				name: 'ativo',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Active', value: 'true' },
					{ name: 'Inactive', value: 'false' },
				],
				default: 'all',
			},
			{ displayName: 'Group IDs (Comma-Separated)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs (Comma-Separated)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Profile ID', name: 'id_perfil', type: 'number', default: 0 },
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	authHeaders: IDataObject,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', i) as string;

	if (operation === 'get') {
		const idUser = this.getNodeParameter('idUser', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/usuarios/${idUser}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (typeof additionalFields.search === 'string' && additionalFields.search.trim()) reqBody.busca = additionalFields.search;
		if (typeof additionalFields.ativo === 'string' && additionalFields.ativo !== 'all') reqBody.ativo = additionalFields.ativo === 'true';
		if (typeof additionalFields.ids === 'string' && additionalFields.ids.trim()) reqBody.ids = toNumArray(additionalFields.ids);
		if (typeof additionalFields.ids_grupo === 'string' && additionalFields.ids_grupo.trim()) reqBody.ids_grupo = toNumArray(additionalFields.ids_grupo);
		if (additionalFields.id_perfil) reqBody.id_perfil = additionalFields.id_perfil;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/usuarios/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'location') {
		const idUser = this.getNodeParameter('idUser', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/usuarios/${idUser}/localizacao`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(Array.isArray(body) ? (body as IDataObject[]) : [body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
