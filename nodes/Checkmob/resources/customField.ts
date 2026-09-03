import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';

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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['customField'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['customField'], operation: ['list'] } },
		options: [
			{
				displayName: 'Origin',
				name: 'cfOrigin',
				type: 'options',
				options: [
					{ name: 'Clients', value: 'clientes' },
					{ name: 'People', value: 'pessoas' },
				],
				default: 'clientes',
				description: 'Which registry to list custom fields from',
			},
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

		const origin = (additionalFields.cfOrigin as string) || 'clientes';
		const reqBody: IDataObject = {};
		if (typeof additionalFields.search === 'string' && additionalFields.search.trim()) {
			reqBody.busca = additionalFields.search;
		}
		if (additionalFields.updatedAfter) reqBody.atualizado_apos = additionalFields.updatedAfter;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/campos-personalizados/${origin}/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
