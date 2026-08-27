import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

const APPROVAL_OPTIONS = [
	{ name: 'Aprovado', value: 0 },
	{ name: 'Desconsiderado', value: 1 },
	{ name: 'Em Verificação', value: 2 },
	{ name: 'Não Avaliado', value: 3 },
	{ name: 'Rejeitado', value: 4 },
];

const PAYMENT_OPTIONS = [
	{ name: 'Em Aberto', value: 0 },
	{ name: 'Aguardando Avaliação', value: 2 },
	{ name: 'Pago', value: 3 },
];

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['travel'] } },
		options: [
			{ name: 'Resumo Por Usuário', value: 'listUsers', description: 'Resumo de deslocamento consolidado por usuário', action: 'Listar resumo de deslocamento por usuario' },
			{ name: 'Listar Dias', value: 'listDays', description: 'Dias de deslocamento de um usuário', action: 'Listar dias de deslocamento' },
			{ name: 'Listar Percursos', value: 'listRoutes', description: 'Percursos (origem → destino) de um dia de deslocamento', action: 'Listar percursos de deslocamento' },
		],
		default: 'listUsers',
	},

	// ── Comuns a Resumo por Usuário e Listar Dias ────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'Data Início',
		name: 'travelDataInicio',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},
	{
		displayName: 'Data Fim',
		name: 'travelDataFim',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays', 'listRoutes'] } },
	},

	// ── Resumo por Usuário / Listar Dias — filtros extras ────────────────────────
	{
		displayName: 'Filtros Adicionais',
		name: 'travelFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers', 'listDays'] } },
		options: [
			{ displayName: 'Aprovação', name: 'aprovacao', type: 'multiOptions', options: APPROVAL_OPTIONS, default: [] },
			{ displayName: 'Pagamento', name: 'pagamento', type: 'multiOptions', options: PAYMENT_OPTIONS, default: [] },
			{
				displayName: 'Ativo',
				name: 'ativo',
				type: 'options',
				options: [{ name: 'Todos', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
		],
	},
	{
		displayName: 'IDs De Usuário (Separados Por Vírgula)',
		name: 'travelIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers'] } },
		placeholder: '1,2,3',
	},
	{
		displayName: 'IDs De Grupo (Separados Por Vírgula)',
		name: 'travelIdsGroup',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['travel'], operation: ['listUsers'] } },
		placeholder: '1,2,3',
	},

	// ── Listar Dias / Listar Percursos ───────────────────────────────────────────
	{
		displayName: 'ID Do Usuário',
		name: 'travelIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['travel'], operation: ['listDays', 'listRoutes'] } },
		description: 'Obrigatório. Informe o ID real de um usuário — a API rejeita 0 ou campo vazio.',
	},

	// ── Listar Percursos ──────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Dia',
		name: 'travelIdDay',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['travel'], operation: ['listRoutes'] } },
		description: 'Obrigatório. Informe o ID real de um dia de deslocamento (obtido em "Listar Dias") — a API rejeita 0 ou campo vazio.',
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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
