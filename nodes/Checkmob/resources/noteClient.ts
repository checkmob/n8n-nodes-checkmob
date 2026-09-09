import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess } from '../transport';

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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['noteClient'], operation: ['list'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text search by note content',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				default: '',
				placeholder: 'name,-updated_at',
				description: 'Comma-separated list of fields to sort by. Prefix a field with "-" for descending order. Allowed field names vary by resource; the API returns an error listing valid names if an unknown field is sent.',
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
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (typeof additionalFields.search === 'string' && additionalFields.search.trim()) {
			reqBody.busca = additionalFields.search;
		}
		if (additionalFields.updatedAfter) reqBody.atualizado_apos = additionalFields.updatedAfter;
		if (typeof additionalFields.sort === 'string' && additionalFields.sort.trim()) {
			reqBody.ordenar = additionalFields.sort;
		}

		const items = await apiRequestAllItems.call(
			this,
			{
				url: `${baseUrl}/v2/clientes/${idClient}/notas/list`,
				headers: authHeaders,
				body: reqBody,
				returnAll,
				limit,
			},
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
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
