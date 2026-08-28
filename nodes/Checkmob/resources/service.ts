import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['service'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get a record by ID', action: 'Get a record' },
			{ name: 'List', value: 'list', description: 'List records with filters', action: 'List records' },
			{ name: 'Create Scheduled', value: 'post', description: 'Create a scheduled record (visit)', action: 'Create a scheduled record' },
			{ name: 'Update', value: 'put', description: 'Update non-sensitive fields (a missing field keeps its current value)', action: 'Update a record' },
		],
		default: 'list',
	},

	// ── Get ──────────────────────────────────────────────────────────────────────
	{
		displayName: 'Record ID',
		name: 'serviceId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['get'] } },
	},

	// ── List ─────────────────────────────────────────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
	},
	{
		displayName: 'Filters',
		name: 'svcFilters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
		options: [
			{
				displayName: 'Active',
				name: 'ativo',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Client IDs (Comma-Separated)', name: 'ids_cliente', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Code', name: 'codigo', type: 'number', default: 0 },
			{
				displayName: 'Completed',
				name: 'concluido',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Completed After', name: 'data_realizacao_apos', type: 'dateTime', default: '' },
			{ displayName: 'Completed Before', name: 'data_realizacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Goal IDs (Comma-Separated)', name: 'ids_objetivo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Group IDs (Comma-Separated)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs (Comma-Separated)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{
				displayName: 'Scheduled',
				name: 'agendado',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Scheduled After', name: 'data_agendada_apos', type: 'dateTime', default: '' },
			{ displayName: 'Scheduled Before', name: 'data_agendada_antes', type: 'dateTime', default: '' },
			{ displayName: 'Search', name: 'busca', type: 'string', default: '' },
			{ displayName: 'Segment IDs (Comma-Separated)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Service Order ID', name: 'id_ordem_servico', type: 'number', default: 0 },
			{ displayName: 'Status IDs (Comma-Separated)', name: 'ids_status', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Updated After', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Incremental sync' },
			{ displayName: 'User IDs (Comma-Separated)', name: 'ids_usuario', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Create Scheduled ─────────────────────────────────────────────────────────
	{
		displayName: 'Client ID',
		name: 'svcIdClient',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'User ID',
		name: 'svcIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Expected Start',
		name: 'svcDataInicioEsperada',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Expected Completion',
		name: 'svcDataConclusaoEsperada',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Active',
		name: 'svcAtivo',
		type: 'boolean',
		default: true,
		required: true,
		description: 'Whether the visit is sent to the user app immediately',
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Optional Fields',
		name: 'svcPostOptional',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
		options: [
			{ displayName: 'Contact ID', name: 'id_contato', type: 'number', default: 0 },
			{ displayName: 'Goal ID', name: 'id_objetivo', type: 'number', default: 0 },
			{ displayName: 'Instructions', name: 'instrucoes', type: 'string', default: '' },
			{ displayName: 'Segment ID', name: 'id_segmento', type: 'number', default: 0 },
			{ displayName: 'Service Order ID', name: 'id_ordem_servico', type: 'number', default: 0 },
			{ displayName: 'Team ID', name: 'id_equipe', type: 'number', default: 0 },
		],
	},

	// ── Update ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Record ID',
		name: 'serviceEditId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['put'] } },
	},
	{
		displayName: 'Fields to Update',
		name: 'svcPutFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['put'] } },
		options: [
			{ displayName: 'Client ID', name: 'id_cliente', type: 'number', default: 0 },
			{ displayName: 'Completion (Check-Out)', name: 'data_realizacao', type: 'dateTime', default: '' },
			{ displayName: 'Goal ID', name: 'id_objetivo', type: 'number', default: 0 },
			{ displayName: 'Latitude', name: 'latitude', type: 'number', default: 0 },
			{ displayName: 'Longitude', name: 'longitude', type: 'number', default: 0 },
			{ displayName: 'Note', name: 'observacao', type: 'string', default: '' },
			{ displayName: 'Start (Check-In)', name: 'data_inicio', type: 'dateTime', default: '' },
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
		const idRegistro = this.getNodeParameter('serviceId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/registros/${idRegistro}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const filters = this.getNodeParameter('svcFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (typeof filters.busca === 'string' && filters.busca.trim()) reqBody.busca = filters.busca;
		if (filters.codigo) reqBody.codigo = filters.codigo;
		if (filters.id_ordem_servico) reqBody.id_ordem_servico = filters.id_ordem_servico;
		for (const key of ['ids', 'ids_cliente', 'ids_usuario', 'ids_grupo', 'ids_segmento', 'ids_objetivo', 'ids_status']) {
			const raw = filters[key];
			if (typeof raw === 'string' && raw.trim()) reqBody[key] = toNumArray(raw);
		}
		for (const key of ['agendado', 'ativo', 'concluido']) {
			const raw = filters[key];
			if (typeof raw === 'string' && raw !== 'all') reqBody[key] = raw === 'true';
		}
		for (const key of ['data_realizacao_apos', 'data_realizacao_antes', 'data_agendada_apos', 'data_agendada_antes', 'atualizado_apos']) {
			if (filters[key]) reqBody[key] = filters[key];
		}

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/registros/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'post') {
		const idCliente = this.getNodeParameter('svcIdClient', i) as number;
		const idUsuario = this.getNodeParameter('svcIdUser', i) as number;
		const dataInicioEsperada = this.getNodeParameter('svcDataInicioEsperada', i) as string;
		const dataConclusaoEsperada = this.getNodeParameter('svcDataConclusaoEsperada', i) as string;
		const ativo = this.getNodeParameter('svcAtivo', i) as boolean;
		const optional = this.getNodeParameter('svcPostOptional', i, {}) as IDataObject;

		const reqBody: IDataObject = {
			id_cliente: idCliente,
			id_usuario: idUsuario,
			data_inicio_esperada: dataInicioEsperada,
			data_conclusao_esperada: dataConclusaoEsperada,
			ativo,
			...optional,
		};

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/registros/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('serviceEditId', i) as number;
		const fields = this.getNodeParameter('svcPutFields', i, {}) as IDataObject;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/registros/${id}`,
			headers: authHeaders,
			body: fields,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
