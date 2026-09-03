import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{ name: 'Create', value: 'post', description: 'Create a new group', action: 'Create group' },
			{ name: 'Delete', value: 'delete', description: 'Delete a group', action: 'Delete group' },
			{ name: 'Get', value: 'get', description: 'Get a group by ID', action: 'Get group' },
			{ name: 'List', value: 'list', description: 'List groups', action: 'List groups' },
			{ name: 'Update', value: 'put', description: 'Replace an existing group', action: 'Update group' },
		],
		default: 'list',
	},

	// ── List ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['group'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text search by name or keyword',
			},
			{
				displayName: 'User IDs (Comma-Separated)',
				name: 'groupFilterIdsUser',
				type: 'string',
				default: '',
				description: 'Filter groups that contain these users. E.g.: 1,2,3.',
				placeholder: '1,2,3',
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

	// ── Get / Update / Delete ───────────────────────────────────────────────
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['get', 'put', 'delete'] } },
	},

	// ── Create / Update ───────────────────────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'groupName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'Group name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		options: [
			{
				displayName: 'User IDs (Comma-Separated)',
				name: 'groupIdsUser',
				type: 'string',
				default: '',
				description: 'IDs of the users that belong to the group. E.g.: 1,2,3.',
				placeholder: '1,2,3',
			},
			{
				displayName: 'Source ID',
				name: 'groupIdOrigem',
				type: 'number',
				default: 0,
				description: 'Source ID of the group (optional)',
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
		if (typeof additionalFields.groupFilterIdsUser === 'string' && additionalFields.groupFilterIdsUser.trim()) {
			reqBody.ids_usuario = toNumArray(additionalFields.groupFilterIdsUser);
		}
		if (additionalFields.updatedAfter) reqBody.atualizado_apos = additionalFields.updatedAfter;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/grupos/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('groupName', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = { nome };
		if (typeof additionalFields.groupIdsUser === 'string' && additionalFields.groupIdsUser.trim()) {
			reqBody.ids_usuarios = toNumArray(additionalFields.groupIdsUser);
		}
		if (additionalFields.groupIdOrigem) reqBody.id_origem = additionalFields.groupIdOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/grupos/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('groupId', i) as number;
		const nome = this.getNodeParameter('groupName', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = { nome };
		if (typeof additionalFields.groupIdsUser === 'string' && additionalFields.groupIdsUser.trim()) {
			reqBody.ids_usuarios = toNumArray(additionalFields.groupIdsUser);
		}
		if (additionalFields.groupIdOrigem) reqBody.id_origem = additionalFields.groupIdOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
