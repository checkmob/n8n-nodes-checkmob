import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['temperature'] } },
		options: [
			{ name: 'List', value: 'list', description: 'List temperatures', action: 'List temperatures' },
		],
		default: 'list',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['temperature'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['temperature'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['temperature'], operation: ['list'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text search by name or keyword',
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
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

	if (operation === 'list') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (typeof additionalFields.search === 'string' && additionalFields.search.trim()) {
			reqBody.busca = additionalFields.search;
		}
		if (additionalFields.updatedAfter) reqBody.atualizado_apos = additionalFields.updatedAfter;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/temperaturas/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
