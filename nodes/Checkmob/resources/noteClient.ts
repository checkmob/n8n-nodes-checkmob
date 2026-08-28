import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['noteClient'] } },
		options: [
			{ name: 'List', value: 'list', description: 'List client notes', action: 'List client notes' },
			{ name: 'Create', value: 'post', description: 'Create a new note', action: 'Create client note' },
			{ name: 'Update', value: 'put', description: 'Update an existing note', action: 'Update client note' },
			{ name: 'Delete', value: 'delete', description: 'Delete a note by ID', action: 'Delete client note' },
		],
		default: 'list',
	},

	// ── List ─────────────────────────────────────────────────────────────────────
	{
		displayName: 'Client ID',
		name: 'noteClientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['noteClient'], operation: ['list', 'post'] } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
	},

	// ── Create ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Note',
		name: 'noteText',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['noteClient'], operation: ['post', 'put'] } },
	},

	// ── Update / Delete ──────────────────────────────────────────────────────────
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['noteClient'], operation: ['put', 'delete'] } },
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
		const idClient = this.getNodeParameter('noteClientId', i) as number;
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes/${idClient}/notas/list`,
			headers: authHeaders,
			body: { pagina: page, por_pagina: perPage },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'post') {
		const idClient = this.getNodeParameter('noteClientId', i) as number;
		const nota = this.getNodeParameter('noteText', i) as string;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes/${idClient}/notas`,
			headers: authHeaders,
			body: { nota },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('noteId', i) as number;
		const nota = this.getNodeParameter('noteText', i) as string;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/notas-cliente/${id}`,
			headers: authHeaders,
			body: { nota },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('noteId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/notas-cliente/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
