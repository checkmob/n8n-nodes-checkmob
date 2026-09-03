import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['serviceOrder'] } },
		options: [
			{ name: 'Change Status', value: 'changeStatus', description: 'Change the status of a service order', action: 'Change status of service order' },
			{ name: 'Create', value: 'post', description: 'Create a service order', action: 'Create service order' },
			{ name: 'Delete', value: 'delete', description: 'Delete a service order', action: 'Delete service order' },
			{ name: 'Delete Bulk', value: 'deleteBulk', description: 'Delete service orders in bulk by IDs (max. 500).', action: 'Delete service orders in bulk' },
			{ name: 'Get', value: 'get', description: 'Get a service order by ID', action: 'Get service order' },
			{ name: 'List', value: 'list', description: 'List service orders', action: 'List service orders' },
			{ name: 'List Status', value: 'listStatus', description: 'List available statuses for service orders', action: 'List service order statuses' },
			{ name: 'Replace', value: 'put', description: 'Replace a service order (missing field preserves current value)', action: 'Replace service order' },
		],
		default: 'list',
	},

	// ── List ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'soListFilters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
		options: [
			{
				displayName: 'Active',
				name: 'ativa',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Code', name: 'codigo', type: 'number', default: 0 },
			{
				displayName: 'Completed',
				name: 'concluida',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Contact IDs (Comma-Separated)', name: 'ids_contato', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Created After', name: 'data_criacao_apos', type: 'dateTime', default: '' },
			{ displayName: 'Created Before', name: 'data_criacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Customer ID', name: 'id_cliente', type: 'number', default: 0 },
			{ displayName: 'Customer IDs (Comma-Separated)', name: 'ids_cliente', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Group IDs (Comma-Separated)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs (Comma-Separated)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Maximum Priority', name: 'prioridade_max', type: 'number', default: 0 },
			{ displayName: 'Minimum Priority', name: 'prioridade_min', type: 'number', default: 0 },
			{ displayName: 'Scheduled After', name: 'data_agendada_apos', type: 'dateTime', default: '' },
			{ displayName: 'Scheduled Before', name: 'data_agendada_antes', type: 'dateTime', default: '' },
			{ displayName: 'Search', name: 'search', type: 'string', default: '' },
			{ displayName: 'Segment IDs (Comma-Separated)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Service Type IDs (Comma-Separated)', name: 'ids_tipo_servico', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Status IDs (Comma-Separated)', name: 'ids_status', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Updated After', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Incremental sync' },
			{ displayName: 'User IDs (Comma-Separated)', name: 'ids_usuario', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Get / Delete ─────────────────────────────────────────────────────────
	{
		displayName: 'Service Order ID',
		name: 'soId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['get', 'delete'] } },
	},

	// ── Create / Replace ───────────────────────────────────────────────────────
	{
		displayName: 'Service Order ID',
		name: 'soPutId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['put'] } },
	},
	{
		displayName: 'Customer ID',
		name: 'soIdCliente',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'soOptional',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
		options: [
			{ displayName: 'Active', name: 'ativa', type: 'boolean', default: true },
			{ displayName: 'Comment', name: 'comentario', type: 'string', default: '' },
			{ displayName: 'Completed', name: 'concluida', type: 'boolean', default: false },
			{ displayName: 'Contact ID', name: 'id_contato', type: 'number', default: 0 },
			{ displayName: 'Created for Me', name: 'criada_para_mim', type: 'boolean', default: false },
			{ displayName: 'Group ID', name: 'id_grupo', type: 'number', default: 0 },
			{ displayName: 'Name', name: 'nome', type: 'string', default: '' },
			{ displayName: 'Priority', name: 'prioridade', type: 'number', default: 0 },
			{ displayName: 'Requires Completion Checklist', name: 'exige_checklist_conclusao', type: 'boolean', default: false },
			{ displayName: 'Scheduled Date', name: 'data_agendada', type: 'dateTime', default: '' },
			{ displayName: 'Scheduled Start', name: 'inicio_agendado', type: 'dateTime', default: '' },
			{ displayName: 'Segment ID', name: 'id_segmento', type: 'number', default: 0 },
			{ displayName: 'Service Type ID', name: 'id_tipo_servico', type: 'number', default: 0 },
			{ displayName: 'User IDs (Comma-Separated)', name: 'ids_usuarios', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Delete Bulk ──────────────────────────────────────────────────────────
	{
		displayName: 'Service Order IDs (Comma-Separated)',
		name: 'soDeleteIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['deleteBulk'] } },
		description: 'Maximum 500 per call. E.g.: 1,2,3.',
		placeholder: '1,2,3',
	},

	// ── Change Status ───────────────────────────────────────────────────────────
	{
		displayName: 'Service Order ID',
		name: 'soStatusId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['changeStatus'] } },
	},
	{
		displayName: 'Status ID',
		name: 'soIdStatus',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['changeStatus'] } },
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
		const filters = this.getNodeParameter('soListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (typeof filters.search === 'string' && filters.search.trim()) reqBody.busca = filters.search;
		if (filters.id_cliente) reqBody.id_cliente = filters.id_cliente;
		if (filters.codigo) reqBody.codigo = filters.codigo;
		if (typeof filters.concluida === 'string' && filters.concluida !== 'all') reqBody.concluida = filters.concluida === 'true';
		if (typeof filters.ativa === 'string' && filters.ativa !== 'all') reqBody.ativa = filters.ativa === 'true';
		for (const key of ['ids', 'ids_cliente', 'ids_status', 'ids_tipo_servico', 'ids_contato', 'ids_grupo', 'ids_segmento', 'ids_usuario']) {
			const raw = filters[key];
			if (typeof raw === 'string' && raw.trim()) reqBody[key] = toNumArray(raw);
		}
		for (const key of ['data_criacao_apos', 'data_criacao_antes', 'data_agendada_apos', 'data_agendada_antes', 'atualizado_apos']) {
			if (filters[key]) reqBody[key] = filters[key];
		}
		if (filters.prioridade_min) reqBody.prioridade_min = filters.prioridade_min;
		if (filters.prioridade_max) reqBody.prioridade_max = filters.prioridade_max;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/ordens-servico/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('soId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/ordens-servico/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post' || operation === 'put') {
		const idCliente = this.getNodeParameter('soIdCliente', i) as number;
		const optional = this.getNodeParameter('soOptional', i, {}) as IDataObject;
		const { ids_usuarios: idsUsersRaw, ...restOptional } = optional;

		const reqBody: IDataObject = { id_cliente: idCliente, ...restOptional };
		if (typeof idsUsersRaw === 'string' && idsUsersRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUsersRaw);

		if (operation === 'post') {
			const { statusCode, body } = await apiRequest.call(this, {
				method: 'POST',
				url: `${baseUrl}/v2/ordens-servico/post`,
				headers: authHeaders,
				body: reqBody,
			});
			assertApiSuccess(statusCode, body, this.getNode());

			return this.helpers.returnJsonArray([body as IDataObject]);
		}

		const id = this.getNodeParameter('soPutId', i) as number;
		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/ordens-servico/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'listStatus') {
		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/ordens-servico/status`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'changeStatus') {
		const id = this.getNodeParameter('soStatusId', i) as number;
		const idStatus = this.getNodeParameter('soIdStatus', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/ordens-servico/${id}/status`,
			headers: authHeaders,
			body: { id_status: idStatus },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('soId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/ordens-servico/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, deleted: true }]);
	}

	if (operation === 'deleteBulk') {
		const ids = toNumArray(this.getNodeParameter('soDeleteIds', i) as string);

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/ordens-servico/excluir`,
			headers: authHeaders,
			body: { ids },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		const resultados = (body as IDataObject)?.resultados;
		return this.helpers.returnJsonArray(Array.isArray(resultados) ? (resultados as IDataObject[]) : [body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
