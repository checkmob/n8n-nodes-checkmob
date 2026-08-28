import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

const APPROVAL_OPTIONS = [
	{ name: 'Approved', value: 0 },
	{ name: 'Disregarded', value: 1 },
	{ name: 'Under Verification', value: 2 },
	{ name: 'Not Evaluated', value: 3 },
	{ name: 'Rejected', value: 4 },
];

const PAYMENT_OPTIONS = [
	{ name: 'Open', value: 0 },
	{ name: 'Awaiting Evaluation', value: 2 },
	{ name: 'Paid', value: 3 },
];

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['travel'] } },
		options: [
			{ name: 'Summary By User', value: 'listUsers', description: 'Travel summary consolidated by user', action: 'List travel summary by user' },
			{ name: 'List Days', value: 'listDays', description: 'Travel days of a user', action: 'List travel days' },
			{ name: 'List Routes', value: 'listRoutes', description: 'Routes (origin → destination) of a travel day', action: 'List travel routes' },
		],
		default: 'listUsers',
	},

	// ── Common to Summary by User and List Days ────────────────────────────────
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'Start Date',
		name: 'travelDataInicio',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'End Date',
		name: 'travelDataFim',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},

	// ── Summary by User / List Days — extra filters ────────────────────────
	{
		displayName: 'Additional Filters',
		name: 'travelFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays'] } },
		options: [
			{ displayName: 'Approval', name: 'aprovacao', type: 'multiOptions', options: APPROVAL_OPTIONS, default: [] },
			{ displayName: 'Payment', name: 'pagamento', type: 'multiOptions', options: PAYMENT_OPTIONS, default: [] },
			{
				displayName: 'Active',
				name: 'ativo',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
		],
	},
	{
		displayName: 'User IDs (Comma-Separated)',
		name: 'travelIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers'] } },
		placeholder: '1,2,3',
	},
	{
		displayName: 'Group IDs (Comma-Separated)',
		name: 'travelIdsGroup',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers'] } },
		placeholder: '1,2,3',
	},

	// ── List Days / List Routes ───────────────────────────────────────────
	{
		displayName: 'User ID',
		name: 'travelIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['travel'], operation: ['listDays', 'listRoutes'] } },
		description: 'Required. Provide the actual ID of a user — the API rejects 0 or an empty field.',
	},

	// ── List Routes ──────────────────────────────────────────────────────────
	{
		displayName: 'Day ID',
		name: 'travelIdDay',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['travel'], operation: ['listRoutes'] } },
		description: 'Required. Provide the actual ID of a travel day (obtained from "List Days") — the API rejects 0 or an empty field.',
	},
];

export async function execute(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	authHeaders: IDataObject,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', i) as string;

	if (operation === 'listUsers' || operation === 'listDays') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const dataInicio = this.getNodeParameter('travelDataInicio', i, '') as string;
		const dataFim = this.getNodeParameter('travelDataFim', i, '') as string;
		const filters = this.getNodeParameter('travelFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (dataInicio) reqBody.data_inicio = dataInicio;
		if (dataFim) reqBody.data_fim = dataFim;
		if (Array.isArray(filters.aprovacao) && filters.aprovacao.length) reqBody.aprovacao = filters.aprovacao;
		if (Array.isArray(filters.pagamento) && filters.pagamento.length) reqBody.pagamento = filters.pagamento;
		if (typeof filters.ativo === 'string' && filters.ativo !== 'all') reqBody.ativo = filters.ativo === 'true';

		if (operation === 'listUsers') {
			const idsUserRaw = this.getNodeParameter('travelIdsUser', i, '') as string;
			const idsGroupRaw = this.getNodeParameter('travelIdsGroup', i, '') as string;
			if (idsUserRaw.trim()) reqBody.ids_usuario = toNumArray(idsUserRaw);
			if (idsGroupRaw.trim()) reqBody.ids_grupo = toNumArray(idsGroupRaw);

			const { statusCode, body } = await apiRequest.call(this, {
				method: 'POST',
				url: `${baseUrl}/v2/deslocamentos/usuarios/list`,
				headers: authHeaders,
				body: reqBody,
			});
			assertApiSuccess(statusCode, body, this.getNode());

			return this.helpers.returnJsonArray(toList(body));
		}

		reqBody.id_usuario = this.getNodeParameter('travelIdUser', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/deslocamentos/dias/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'listRoutes') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const idUsuario = this.getNodeParameter('travelIdUser', i) as number;
		const idDia = this.getNodeParameter('travelIdDay', i) as number;
		const dataInicio = this.getNodeParameter('travelDataInicio', i, '') as string;
		const dataFim = this.getNodeParameter('travelDataFim', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage, id_usuario: idUsuario, id_dia: idDia };
		if (dataInicio) reqBody.data_inicio = dataInicio;
		if (dataFim) reqBody.data_fim = dataFim;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/deslocamentos/percursos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
