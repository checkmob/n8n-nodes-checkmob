import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

const LINK_ADD: Record<string, string> = {
	linkClient: 'clientes',
	linkGroup: 'grupos',
	linkUser: 'usuarios',
};

const LINK_REMOVE: Record<string, string> = {
	deleteLinkClient: 'clientes',
	deleteLinkGroup: 'grupos',
	deleteLinkUser: 'usuarios',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['segment'] } },
		options: [
			{ name: 'Create', value: 'post', description: 'Create a segment', action: 'Create segment' },
			{ name: 'Delete', value: 'delete', description: 'Delete a segment', action: 'Delete segment' },
			{ name: 'Get', value: 'get', description: 'Get a segment by ID', action: 'Get segment' },
			{ name: 'Get Links', value: 'getLinks', description: 'Get links (users and groups) of the segment', action: 'Get segment links' },
			{ name: 'Link Client', value: 'linkClient', description: 'Link a client to the segment', action: 'Link client to segment' },
			{ name: 'Link Group', value: 'linkGroup', description: 'Link a group to the segment', action: 'Link group to segment' },
			{ name: 'Link User', value: 'linkUser', description: 'Link a user to the segment', action: 'Link user to segment' },
			{ name: 'List', value: 'list', description: 'List segments', action: 'List segments' },
			{ name: 'Remove Client Link', value: 'deleteLinkClient', description: 'Unlink a client from the segment', action: 'Remove client link' },
			{ name: 'Remove Group Link', value: 'deleteLinkGroup', description: 'Unlink a group from the segment', action: 'Remove group link' },
			{ name: 'Remove User Link', value: 'deleteLinkUser', description: 'Unlink a user from the segment', action: 'Remove user link' },
			{ name: 'Update', value: 'put', description: 'Replace a segment', action: 'Update segment' },
		],
		default: 'list',
	},

	// ── Get / Update / Delete / Get Links ──────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['get', 'put', 'delete', 'getLinks'] } },
	},

	// ── List ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Active',
		name: 'segActive',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Active', value: 'true' },
			{ name: 'Inactive', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Updated After',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},

	// ── Create ────────────────────────────────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'segName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
	},
	{
		displayName: 'User IDs (Comma-Separated)',
		name: 'segIdsUsers',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
		placeholder: '1,2,3',
	},
	{
		displayName: 'Group IDs (Comma-Separated)',
		name: 'segIdsGroups',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
		placeholder: '1,2,3',
	},

	// ── Update ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'segPutName',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['put'] } },
		description: 'Leave empty to keep the current name',
	},
	{
		displayName: 'Active',
		name: 'segPutActive',
		type: 'options',
		options: [
			{ name: 'Keep Current', value: 'keep' },
			{ name: 'Active', value: 'true' },
			{ name: 'Inactive', value: 'false' },
		],
		default: 'keep',
		displayOptions: { show: { resource: ['segment'], operation: ['put'] } },
	},

	// ── Link Operations ─────────────────────────────────────────────────────
	{
		displayName: 'Segment ID',
		name: 'segmentLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkClient', 'deleteLinkClient', 'linkGroup', 'deleteLinkGroup', 'linkUser', 'deleteLinkUser'] } },
	},
	{
		displayName: 'Client ID',
		name: 'segLinkedIdClient',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkClient', 'deleteLinkClient'] } },
	},
	{
		displayName: 'Group ID',
		name: 'segLinkedIdGroup',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkGroup', 'deleteLinkGroup'] } },
	},
	{
		displayName: 'User ID',
		name: 'segLinkedIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkUser', 'deleteLinkUser'] } },
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
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'getLinks') {
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/segmentos/${id}/vinculos`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const activeParam = this.getNodeParameter('segActive', i, 'all') as string;
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (activeParam !== 'all') reqBody.ativo = activeParam === 'true';
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('segName', i) as string;
		const idsUsersRaw = this.getNodeParameter('segIdsUsers', i, '') as string;
		const idsGroupsRaw = this.getNodeParameter('segIdsGroups', i, '') as string;

		const reqBody: IDataObject = { nome };
		if (idsUsersRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUsersRaw);
		if (idsGroupsRaw.trim()) reqBody.ids_grupos = toNumArray(idsGroupsRaw);

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('segmentId', i) as number;
		const nome = this.getNodeParameter('segPutName', i, '') as string;
		const activeParam = this.getNodeParameter('segPutActive', i, 'keep') as string;

		const reqBody: IDataObject = {};
		if (nome.trim()) reqBody.nome = nome;
		if (activeParam !== 'keep') reqBody.ativo = activeParam === 'true';

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	if (LINK_ADD[operation]) {
		const subPath = LINK_ADD[operation];
		const idSegment = this.getNodeParameter('segmentLinkId', i) as number;
		const linkedId = this.getNodeParameter(
			subPath === 'clientes' ? 'segLinkedIdClient' : subPath === 'grupos' ? 'segLinkedIdGroup' : 'segLinkedIdUser',
			i,
		) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/${idSegment}/${subPath}`,
			headers: authHeaders,
			body: { ids: [linkedId] },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idSegment, linkedId, vinculado: true }]);
	}

	if (LINK_REMOVE[operation]) {
		const subPath = LINK_REMOVE[operation];
		const idSegment = this.getNodeParameter('segmentLinkId', i) as number;
		const linkedId = this.getNodeParameter(
			subPath === 'clientes' ? 'segLinkedIdClient' : subPath === 'grupos' ? 'segLinkedIdGroup' : 'segLinkedIdUser',
			i,
		) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/segmentos/${idSegment}/${subPath}/${linkedId}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idSegment, linkedId, desvinculado: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
