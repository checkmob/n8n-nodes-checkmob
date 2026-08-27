import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['objective'] } },
		options: [
			{ name: 'Listar', value: 'list', description: 'Listar objetivos', action: 'Listar objetivos' },
		],
		default: 'list',
	},
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['objective'], operation: ['list'] } },
		description: 'Página a buscar (começa em 1)',
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['objective'], operation: ['list'] } },
		description: 'Itens por página (máximo 100)',
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['objective'], operation: ['list'] } },
		description: 'Busca textual por nome ou palavra-chave',
	},
	{
		displayName: 'Atualizado Após',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['objective'], operation: ['list'] } },
		description: 'Sync incremental: retorna apenas registros atualizados após esta data',
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
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/objetivos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
