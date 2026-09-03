import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess } from '../transport';

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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['answerChecklist'], operation: ['list'] } },
		options: [
			{
				displayName: 'Updated After',
				name: 'acUpdatedAfter',
				type: 'dateTime',
				default: '',
				description: 'Incremental sync: returns only records updated after this date',
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
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (additionalFields.acUpdatedAfter) reqBody.atualizado_apos = additionalFields.acUpdatedAfter;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/respostas-questionario/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
