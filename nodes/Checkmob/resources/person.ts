import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['person'] } },
		options: [
			{ name: 'Activate/Deactivate in Bulk', value: 'status', description: 'Activate or deactivate people in bulk (max. 500).', action: 'Activate or deactivate people' },
			{ name: 'Create', value: 'post', description: 'Create a new person', action: 'Create person' },
			{ name: 'Delete', value: 'delete', description: 'Delete a person', action: 'Delete person' },
			{ name: 'Get', value: 'get', description: 'Get a person by ID', action: 'Get person' },
			{ name: 'Link Clients', value: 'linkClients', description: 'Link a person to one or more clients (max. 500).', action: 'Link person to clients' },
			{ name: 'List', value: 'list', description: 'List people/contacts', action: 'List people' },
			{ name: 'Unlink Clients', value: 'unlinkClients', description: 'Remove the link between a person and clients (max. 500).', action: 'Unlink person from clients' },
			{ name: 'Update', value: 'put', description: 'Update an existing person', action: 'Update person' },
		],
		default: 'list',
	},

	// ── List ─────────────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['person'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'personListFilters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
		options: [
			{ displayName: 'Active', name: 'personActive', type: 'options', options: [
				{ name: 'All', value: 'all' },
				{ name: 'Active', value: 'true' },
				{ name: 'Inactive', value: 'false' },
			], default: 'all' },
			{ displayName: 'Client IDs (Comma-Separated)', name: 'ids_clientes', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'IDs (Comma-Separated)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Search', name: 'search', type: 'string', default: '' },
			{ displayName: 'Updated After', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Incremental sync' },
		],
	},

	// ── Get / Delete ─────────────────────────────────────────────────────────────
	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['get', 'delete'] } },
	},

	// ── Create ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Name',
		name: 'personName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['post'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'personPostFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['post'] } },
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'Phone', name: 'telefone', type: 'string', default: '' },
			{ displayName: 'Mobile Phone', name: 'celular', type: 'string', default: '' },
			{ displayName: 'Client IDs (Comma-Separated)', name: 'idsClientes', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Update ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Person ID',
		name: 'personEditId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['put'] } },
	},
	{
		displayName: 'Fields to Update',
		name: 'personPutFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['put'] } },
		options: [
			{ displayName: 'Active', name: 'ativo', type: 'boolean', default: true },
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'Mobile Phone', name: 'celular', type: 'string', default: '' },
			{ displayName: 'Name', name: 'nome', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'telefone', type: 'string', default: '' },
		],
	},

	// ── Activate/Deactivate in Bulk ──────────────────────────────────────────────
	{
		displayName: 'Person IDs (Comma-Separated)',
		name: 'personStatusIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['status'] } },
		description: 'Maximum 500 per call. E.g.: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'Active',
		name: 'personStatusAtivo',
		type: 'boolean',
		default: true,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['status'] } },
	},

	// ── Link / Unlink Clients ────────────────────────────────────────────────────
	{
		displayName: 'Person ID',
		name: 'personLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['linkClients', 'unlinkClients'] } },
	},
	{
		displayName: 'Client IDs (Comma-Separated)',
		name: 'personLinkClientIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['linkClients', 'unlinkClients'] } },
		description: 'Maximum 500 per call. E.g.: 1,2,3.',
		placeholder: '1,2,3',
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
		const filters = this.getNodeParameter('personListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (typeof filters.search === 'string' && filters.search.trim()) reqBody.busca = filters.search;
		if (typeof filters.personActive === 'string' && filters.personActive !== 'all') {
			reqBody.ativo = filters.personActive === 'true';
		}
		if (typeof filters.email === 'string' && filters.email.trim()) reqBody.email = filters.email;
		if (typeof filters.ids === 'string' && filters.ids.trim()) reqBody.ids = toNumArray(filters.ids);
		if (typeof filters.ids_clientes === 'string' && filters.ids_clientes.trim()) {
			reqBody.ids_clientes = toNumArray(filters.ids_clientes);
		}
		if (filters.atualizado_apos) reqBody.atualizado_apos = filters.atualizado_apos;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/pessoas/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('personId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/pessoas/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('personName', i) as string;
		const fields = this.getNodeParameter('personPostFields', i, {}) as IDataObject;

		const reqBody: IDataObject = { nome };
		if (typeof fields.email === 'string' && fields.email) reqBody.email = fields.email;
		if (typeof fields.telefone === 'string' && fields.telefone) reqBody.telefone = fields.telefone;
		if (typeof fields.celular === 'string' && fields.celular) reqBody.celular = fields.celular;
		if (typeof fields.idsClientes === 'string' && fields.idsClientes.trim()) {
			reqBody.ids_clientes = toNumArray(fields.idsClientes);
		}

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/pessoas/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('personEditId', i) as number;
		const fields = this.getNodeParameter('personPutFields', i, {}) as IDataObject;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/pessoas/${id}`,
			headers: authHeaders,
			body: fields,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('personId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/pessoas/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, deleted: true }]);
	}

	if (operation === 'status') {
		const idsPessoas = toNumArray(this.getNodeParameter('personStatusIds', i) as string);
		const ativo = this.getNodeParameter('personStatusAtivo', i) as boolean;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/pessoas/status`,
			headers: authHeaders,
			body: { ids_pessoas: idsPessoas, ativo },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idsPessoas, ativo, success: true }]);
	}

	if (operation === 'linkClients' || operation === 'unlinkClients') {
		const idPessoa = this.getNodeParameter('personLinkId', i) as number;
		const idsClientes = toNumArray(this.getNodeParameter('personLinkClientIds', i) as string);
		const subPath = operation === 'linkClients' ? 'vincular' : 'desvincular';

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/pessoas/clientes/${subPath}`,
			headers: authHeaders,
			body: { id_pessoa: idPessoa, ids_clientes: idsClientes },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idPessoa, idsClientes, success: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
