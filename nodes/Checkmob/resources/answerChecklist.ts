import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['answerChecklist'] } },
		options: [
			{ name: 'Buscar Por Registro', value: 'get', description: 'Buscar respostas pelo ID do registro. 404 significa que não houve questionário nesta visita (não é erro de integração).', action: 'Buscar respostas por registro' },
			{ name: 'Buscar Por Ordem De Serviço', value: 'getByServiceOrder', description: 'Buscar respostas pelo ID da ordem de serviço', action: 'Buscar respostas por OS' },
			{ name: 'Listar', value: 'list', description: 'Listar questionários respondidos (resumo)', action: 'Listar questionarios respondidos' },
		],
		default: 'list',
	},

	// ── Buscar por Registro ───────────────────────────────────────────────────────
	{
		displayName: 'ID Do Registro',
		name: 'acIdService',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['get'] } },
	},

	// ── Buscar por Ordem de Serviço ───────────────────────────────────────────────
	{
		displayName: 'ID Da Ordem De Serviço',
		name: 'acIdServiceOrder',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['getByServiceOrder'] } },
	},

	// ── Listar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
	},
	{
		displayName: 'Atualizado Após',
		name: 'acUpdatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
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

	if (operation === 'get') {
		const idService = this.getNodeParameter('acIdService', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/respostas-questionario/${idService}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'getByServiceOrder') {
		const idServiceOrder = this.getNodeParameter('acIdServiceOrder', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/respostas-questionario/ordem-servico/${idServiceOrder}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const updatedAfter = this.getNodeParameter('acUpdatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/respostas-questionario/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
