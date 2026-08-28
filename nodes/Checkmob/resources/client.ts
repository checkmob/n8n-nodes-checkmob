import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray, parseJson } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['client'] } },
		options: [
			{ name: 'Create', value: 'post', description: 'Create a new client', action: 'Create client' },
			{ name: 'Create in Bulk', value: 'postBulk', description: 'Create multiple clients in a single call (max. 500).', action: 'Create clients in bulk' },
			{ name: 'Delete', value: 'delete', description: 'Delete a client', action: 'Delete client' },
			{ name: 'Get', value: 'get', description: 'Get a client by ID', action: 'Get client' },
			{ name: 'Link People', value: 'linkPeople', description: 'Link one or more people to the client (max. 500).', action: 'Link people to client' },
			{ name: 'List', value: 'list', description: 'Get clients paginated and with filters', action: 'List clients' },
			{ name: 'Replace', value: 'put', description: 'Replace an existing client', action: 'Replace client' },
			{ name: 'Unlink People', value: 'unlinkPeople', description: 'Remove the link between a client and people (max. 500).', action: 'Unlink people from client' },
			{ name: 'Update Partially', value: 'patch', description: 'Partially update an existing client', action: 'Update client partially' },
		],
		default: 'list',
	},

	// ── List ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Page to fetch (starts at 1)',
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Items per page (maximum 100)',
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Text search by name, code, or document',
	},
	{
		displayName: 'Active',
		name: 'clientActive',
		type: 'options',
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Active', value: 'true' },
			{ name: 'Inactive', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
	},
	{
		displayName: 'Additional Filters',
		name: 'clientListFilters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		options: [
			{ displayName: 'Category IDs (Comma-Separated)', name: 'ids_categoria', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Codes (Comma-Separated)', name: 'codigos', type: 'string', default: '', placeholder: 'A001,A002' },
			{ displayName: 'Created After', name: 'data_criacao_apos', type: 'dateTime', default: '' },
			{ displayName: 'Created Before', name: 'data_criacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Document', name: 'documento', type: 'string', default: '' },
			{ displayName: 'IDs (Comma-Separated)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Market Sector IDs (Comma-Separated)', name: 'ids_setor_mercado', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Segment IDs (Comma-Separated)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Stage IDs (Comma-Separated)', name: 'ids_etapa', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Temperature IDs (Comma-Separated)', name: 'ids_temperatura', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Updated After', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Incremental sync' },
		],
	},

	// ── Get / Replace / Update Partially / Delete ─────────────────────
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['get', 'put', 'patch', 'delete'] } },
	},

	// ── Create / Replace / Update Partially ────────────────────────────────
	{
		displayName: 'Type',
		name: 'clientTipo',
		type: 'options',
		options: [
			{ name: 'Individual', value: 'F' },
			{ name: 'Company', value: 'J' },
			{ name: 'Foreign', value: 'N' },
		],
		default: 'J',
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Name',
		name: 'clientName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Document',
		name: 'clientDocumento',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
		description: 'CPF, CNPJ, or foreign document',
	},
	{
		displayName: 'Active',
		name: 'clientAtivo',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Fields to Update',
		name: 'clientPatchFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['client'], operation: ['patch'] } },
		options: [
			{
				displayName: 'Type',
				name: 'tipo',
				type: 'options',
				options: [
					{ name: 'Individual', value: 'F' },
					{ name: 'Company', value: 'J' },
					{ name: 'Foreign', value: 'N' },
				],
				default: 'J',
			},
			{ displayName: 'Name', name: 'nome', type: 'string', default: '' },
			{ displayName: 'Document', name: 'documento', type: 'string', default: '' },
			{ displayName: 'Active', name: 'ativo', type: 'boolean', default: true },
		],
	},

	// ── Create in Bulk ────────────────────────────────────────────────────────────
	{
		displayName: 'Clients (JSON)',
		name: 'clientsBulkJson',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '[]',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['postBulk'] } },
		description: 'JSON array with up to 500 clients to create. E.g.: [{"tipo":"J","nome":"Empresa","documento":"123","ativo":true}].',
	},

	// ── Link / Unlink People ───────────────────────────────────────────
	{
		displayName: 'Client ID',
		name: 'clientLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['linkPeople', 'unlinkPeople'] } },
	},
	{
		displayName: 'People IDs (Comma-Separated)',
		name: 'clientLinkPeopleIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['linkPeople', 'unlinkPeople'] } },
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
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const activeParam = this.getNodeParameter('clientActive', i, 'all') as string;
		const filters = this.getNodeParameter('clientListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (activeParam !== 'all') reqBody.ativo = activeParam === 'true';

		if (typeof filters.ids === 'string' && filters.ids.trim()) reqBody.ids = toNumArray(filters.ids);
		if (typeof filters.codigos === 'string' && filters.codigos.trim()) {
			reqBody.codigos = filters.codigos.split(',').map((v) => v.trim()).filter(Boolean);
		}
		if (typeof filters.documento === 'string' && filters.documento.trim()) reqBody.documento = filters.documento;
		for (const key of ['ids_segmento', 'ids_categoria', 'ids_temperatura', 'ids_setor_mercado', 'ids_etapa']) {
			const raw = filters[key];
			if (typeof raw === 'string' && raw.trim()) reqBody[key] = toNumArray(raw);
		}
		if (filters.data_criacao_apos) reqBody.data_criacao_apos = filters.data_criacao_apos;
		if (filters.data_criacao_antes) reqBody.data_criacao_antes = filters.data_criacao_antes;
		if (filters.atualizado_apos) reqBody.atualizado_apos = filters.atualizado_apos;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('clientId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/clientes/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post') {
		const tipo = this.getNodeParameter('clientTipo', i) as string;
		const nome = this.getNodeParameter('clientName', i) as string;
		const documento = this.getNodeParameter('clientDocumento', i, '') as string;
		const ativo = this.getNodeParameter('clientAtivo', i, true) as boolean;

		const reqBody: IDataObject = { tipo, nome, ativo };
		if (documento) reqBody.documento = documento;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'postBulk') {
		const clientsRaw = this.getNodeParameter('clientsBulkJson', i, '[]') as string;
		const clientes = parseJson(clientsRaw, this.getNode(), 'Clients (JSON)');

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes/criar-lote`,
			headers: authHeaders,
			body: { clientes },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		const resultados = (body as IDataObject)?.resultados;
		return this.helpers.returnJsonArray(Array.isArray(resultados) ? (resultados as IDataObject[]) : [body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('clientId', i) as number;
		const tipo = this.getNodeParameter('clientTipo', i) as string;
		const nome = this.getNodeParameter('clientName', i) as string;
		const documento = this.getNodeParameter('clientDocumento', i, '') as string;
		const ativo = this.getNodeParameter('clientAtivo', i, true) as boolean;

		const reqBody: IDataObject = { tipo, nome, ativo };
		if (documento) reqBody.documento = documento;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/clientes/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'patch') {
		const id = this.getNodeParameter('clientId', i) as number;
		const fields = this.getNodeParameter('clientPatchFields', i, {}) as IDataObject;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PATCH',
			url: `${baseUrl}/v2/clientes/${id}`,
			headers: authHeaders,
			body: fields,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('clientId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/clientes/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	if (operation === 'linkPeople' || operation === 'unlinkPeople') {
		const idCliente = this.getNodeParameter('clientLinkId', i) as number;
		const idsPessoas = toNumArray(this.getNodeParameter('clientLinkPeopleIds', i) as string);
		const subPath = operation === 'linkPeople' ? 'vincular' : 'desvincular';

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/clientes/pessoas/${subPath}`,
			headers: authHeaders,
			body: { id_cliente: idCliente, ids_pessoas: idsPessoas },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idCliente, idsPessoas, sucesso: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
