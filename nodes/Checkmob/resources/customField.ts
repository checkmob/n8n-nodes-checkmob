import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customField'] } },
		options: [
			{ name: 'List', value: 'list', description: 'List custom fields', action: 'List custom fields' },
		],
		default: 'list',
	},
	{
		displayName: 'Origin',
		name: 'cfOrigin',
		type: 'options',
		options: [
			{ name: 'Clients', value: 'clientes' },
			{ name: 'People', value: 'pessoas' },
		],
		default: 'clientes',
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Which registry to list custom fields from',
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Page to fetch (starts at 1)',
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Items per page (maximum 100)',
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Text search by name or keyword',
	},
	{
		displayName: 'Updated After',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Incremental sync: returns only records updated after this date',
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
		const origin = this.getNodeParameter('cfOrigin', i, 'clientes') as string;
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/campos-personalizados/${origin}/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
