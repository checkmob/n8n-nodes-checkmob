import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['noteClient'] } },
		options: [
			{ name: 'Listar', value: 'list', description: 'Listar notas do cliente', action: 'Listar notas do cliente' },
			{ name: 'Criar', value: 'post', description: 'Criar uma nova nota', action: 'Criar nota do cliente' },
			{ name: 'Editar', value: 'put', description: 'Editar uma nota existente', action: 'Editar nota do cliente' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir uma nota pelo ID', action: 'Excluir nota do cliente' },
		],
		default: 'list',
	},

	// ── Listar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Cliente',
		name: 'noteClientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['noteClient'], operation: ['list', 'post'] } },
	},
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
	},

	// ── Criar ────────────────────────────────────────────────────────────────────
	{
		displayName: 'Nota',
		name: 'noteText',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['noteClient'], operation: ['post', 'put'] } },
	},

	// ── Editar / Excluir ─────────────────────────────────────────────────────────
	{
		displayName: 'ID Da Nota',
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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
