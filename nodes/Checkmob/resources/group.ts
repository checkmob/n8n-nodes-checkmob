import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{ name: 'Create', value: 'post', description: 'Create a new group', action: 'Create group' },
			{ name: 'Delete', value: 'delete', description: 'Delete a group', action: 'Delete group' },
			{ name: 'Get', value: 'get', description: 'Get a group by ID', action: 'Get group' },
			{ name: 'List', value: 'list', description: 'List groups', action: 'List groups' },
			{ name: 'Update', value: 'put', description: 'Replace an existing group', action: 'Update group' },
		],
		default: 'list',
	},

	// ── List ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Page to fetch (starts at 1)',
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Items per page (maximum 100)',
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Text search by name or keyword',
	},
	{
		displayName: 'User IDs (Comma-Separated)',
		name: 'groupFilterIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Filter groups that contain these users. E.g.: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'Updated After',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Incremental sync: returns only records updated after this date',
	},

	// ── Get / Update / Delete ───────────────────────────────────────────────
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['get', 'put', 'delete'] } },
	},

	// ── Create / Update ───────────────────────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'groupName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'Group name',
	},
	{
		displayName: 'User IDs (Comma-Separated)',
		name: 'groupIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'IDs of the users that belong to the group. E.g.: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'Source ID',
		name: 'groupIdOrigem',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'Source ID of the group (optional)',
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	authHeaders: IDataObject,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', i) as string;

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const idsUserRaw = this.getNodeParameter('groupFilterIdsUser', i, '') as string;
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (idsUserRaw.trim()) reqBody.ids_usuario = toNumArray(idsUserRaw);
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/grupos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('groupName', i) as string;
		const idsUserRaw = this.getNodeParameter('groupIdsUser', i, '') as string;
		const idOrigem = this.getNodeParameter('groupIdOrigem', i, 0) as number;

		const reqBody: IDataObject = { nome };
		if (idsUserRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUserRaw);
		if (idOrigem) reqBody.id_origem = idOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/grupos/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('groupId', i) as number;
		const nome = this.getNodeParameter('groupName', i) as string;
		const idsUserRaw = this.getNodeParameter('groupIdsUser', i, '') as string;
		const idOrigem = this.getNodeParameter('groupIdOrigem', i, 0) as number;

		const reqBody: IDataObject = { nome };
		if (idsUserRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUserRaw);
		if (idOrigem) reqBody.id_origem = idOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
