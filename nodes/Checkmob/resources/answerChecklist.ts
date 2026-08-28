import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['answerChecklist'] } },
		options: [
			{ name: 'Get by Record', value: 'get', description: 'Get answers by record ID. A 404 means there was no questionnaire for this visit (not an integration error).', action: 'Get answers by record' },
			{ name: 'Get by Service Order', value: 'getByServiceOrder', description: 'Get answers by service order ID', action: 'Get answers by service order' },
			{ name: 'List', value: 'list', description: 'List answered questionnaires (summary)', action: 'List answered questionnaires' },
		],
		default: 'list',
	},

	// ── Get by Record ───────────────────────────────────────────────────────
	{
		displayName: 'Record ID',
		name: 'acIdService',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['get'] } },
	},

	// ── Get by Service Order ───────────────────────────────────────────────
	{
		displayName: 'Service Order ID',
		name: 'acIdServiceOrder',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['getByServiceOrder'] } },
	},

	// ── List ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
	},
	{
		displayName: 'Updated After',
		name: 'acUpdatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
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

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
