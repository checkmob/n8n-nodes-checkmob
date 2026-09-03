import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequestAllItems, toNumArray } from '../transport';

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

	// ── Common to Summary by User, List Days and List Routes ────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'], returnAll: [false] } },
		description: 'Max number of results to return',
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

	// ── Summary by User / List Days — additional fields ─────────────────────
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays'] } },
		options: [
			{
				displayName: 'Active',
				name: 'ativo',
				type: 'options',
				options: [{ name: 'All', value: 'all' }, { name: 'Yes', value: 'true' }, { name: 'No', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Approval', name: 'aprovacao', type: 'multiOptions', options: APPROVAL_OPTIONS, default: [] },
			{ displayName: 'End Date', name: 'travelDataFim', type: 'dateTime', default: '' },
			{ displayName: 'Payment', name: 'pagamento', type: 'multiOptions', options: PAYMENT_OPTIONS, default: [] },
			{ displayName: 'Start Date', name: 'travelDataInicio', type: 'dateTime', default: '' },
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsUsers',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers'] } },
		options: [
			{ displayName: 'User IDs (Comma-Separated)', name: 'travelIdsUser', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Group IDs (Comma-Separated)', name: 'travelIdsGroup', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── List Routes — additional fields ──────────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsRoutes',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['travel'], operation: ['listRoutes'] } },
		options: [
			{ displayName: 'Start Date', name: 'travelDataInicio', type: 'dateTime', default: '' },
			{ displayName: 'End Date', name: 'travelDataFim', type: 'dateTime', default: '' },
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

	if (operation === 'listUsers' || operation === 'listDays') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const reqBody: IDataObject = {};
		if (additionalFields.travelDataInicio) reqBody.data_inicio = additionalFields.travelDataInicio;
		if (additionalFields.travelDataFim) reqBody.data_fim = additionalFields.travelDataFim;
		if (Array.isArray(additionalFields.aprovacao) && additionalFields.aprovacao.length) reqBody.aprovacao = additionalFields.aprovacao;
		if (Array.isArray(additionalFields.pagamento) && additionalFields.pagamento.length) reqBody.pagamento = additionalFields.pagamento;
		if (typeof additionalFields.ativo === 'string' && additionalFields.ativo !== 'all') reqBody.ativo = additionalFields.ativo === 'true';

		if (operation === 'listUsers') {
			const additionalFieldsUsers = this.getNodeParameter('additionalFieldsUsers', i, {}) as IDataObject;
			const idsUserRaw = (additionalFieldsUsers.travelIdsUser as string) ?? '';
			const idsGroupRaw = (additionalFieldsUsers.travelIdsGroup as string) ?? '';
			if (idsUserRaw.trim()) reqBody.ids_usuario = toNumArray(idsUserRaw);
			if (idsGroupRaw.trim()) reqBody.ids_grupo = toNumArray(idsGroupRaw);

			const items = await apiRequestAllItems.call(
				this,
				{ url: `${baseUrl}/v2/deslocamentos/usuarios/list`, headers: authHeaders, body: reqBody, returnAll, limit },
				this.getNode(),
			);

			return this.helpers.returnJsonArray(items);
		}

		reqBody.id_usuario = this.getNodeParameter('travelIdUser', i) as number;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/deslocamentos/dias/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'listRoutes') {
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const idUsuario = this.getNodeParameter('travelIdUser', i) as number;
		const idDia = this.getNodeParameter('travelIdDay', i) as number;
		const additionalFieldsRoutes = this.getNodeParameter('additionalFieldsRoutes', i, {}) as IDataObject;

		const reqBody: IDataObject = { id_usuario: idUsuario, id_dia: idDia };
		if (additionalFieldsRoutes.travelDataInicio) reqBody.data_inicio = additionalFieldsRoutes.travelDataInicio;
		if (additionalFieldsRoutes.travelDataFim) reqBody.data_fim = additionalFieldsRoutes.travelDataFim;

		const items = await apiRequestAllItems.call(
			this,
			{ url: `${baseUrl}/v2/deslocamentos/percursos/list`, headers: authHeaders, body: reqBody, returnAll, limit },
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
