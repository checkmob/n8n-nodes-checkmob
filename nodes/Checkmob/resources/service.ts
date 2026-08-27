import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['service'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar registro pelo ID', action: 'Buscar registro' },
			{ name: 'Listar', value: 'list', description: 'Listar registros com filtros', action: 'Listar registros' },
			{ name: 'Criar Agendado', value: 'post', description: 'Criar um registro (visita) agendado', action: 'Criar registro agendado' },
			{ name: 'Editar', value: 'put', description: 'Editar campos não sensíveis (campo ausente preserva valor atual)', action: 'Editar registro' },
		],
		default: 'list',
	},

	// ── Buscar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Registro',
		name: 'serviceId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['get'] } },
	},

	// ── Listar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
	},
	{
		displayName: 'Filtros',
		name: 'svcFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['list'] } },
		options: [
			{
				displayName: 'Agendado',
				name: 'agendado',
				type: 'options',
				options: [{ name: 'Todos', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Agendado Antes', name: 'data_agendada_antes', type: 'dateTime', default: '' },
			{ displayName: 'Agendado Após', name: 'data_agendada_apos', type: 'dateTime', default: '' },
			{
				displayName: 'Ativo',
				name: 'ativo',
				type: 'options',
				options: [{ name: 'Todos', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Atualizado Após', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Sync incremental' },
			{ displayName: 'Busca', name: 'busca', type: 'string', default: '' },
			{ displayName: 'Código', name: 'codigo', type: 'number', default: 0 },
			{
				displayName: 'Concluído',
				name: 'concluido',
				type: 'options',
				options: [{ name: 'Todos', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'ID Da Ordem De Serviço', name: 'id_ordem_servico', type: 'number', default: 0 },
			{ displayName: 'IDs (Separados Por Vírgula)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Cliente (Separados Por Vírgula)', name: 'ids_cliente', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Grupo (Separados Por Vírgula)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Objetivo (Separados Por Vírgula)', name: 'ids_objetivo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Segmento (Separados Por Vírgula)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Status (Separados Por Vírgula)', name: 'ids_status', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Usuário (Separados Por Vírgula)', name: 'ids_usuario', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Realizado Antes', name: 'data_realizacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Realizado Após', name: 'data_realizacao_apos', type: 'dateTime', default: '' },
			
		],
	},

	// ── Criar Agendado ───────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Cliente',
		name: 'svcIdClient',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'ID Do Usuário',
		name: 'svcIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Início Esperado',
		name: 'svcDataInicioEsperada',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Conclusão Esperada',
		name: 'svcDataConclusaoEsperada',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Ativo',
		name: 'svcAtivo',
		type: 'boolean',
		default: true,
		required: true,
		description: 'Whether the visit is sent to the user app immediately',
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
	},
	{
		displayName: 'Campos Opcionais',
		name: 'svcPostOptional',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['post'] } },
		options: [
			{ displayName: 'ID Da Equipe', name: 'id_equipe', type: 'number', default: 0 },
			{ displayName: 'ID Da Ordem De Serviço', name: 'id_ordem_servico', type: 'number', default: 0 },
			{ displayName: 'ID Do Contato', name: 'id_contato', type: 'number', default: 0 },
			{ displayName: 'ID Do Objetivo', name: 'id_objetivo', type: 'number', default: 0 },
			{ displayName: 'ID Do Segmento', name: 'id_segmento', type: 'number', default: 0 },			
			{ displayName: 'Instruções', name: 'instrucoes', type: 'string', default: '' },
		],
	},

	// ── Editar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Registro',
		name: 'serviceEditId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['service'], operation: ['put'] } },
	},
	{
		displayName: 'Campos A Atualizar',
		name: 'svcPutFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['service'], operation: ['put'] } },
		options: [
			{ displayName: 'ID Do Cliente', name: 'id_cliente', type: 'number', default: 0 },
			{ displayName: 'ID Do Objetivo', name: 'id_objetivo', type: 'number', default: 0 },
			{ displayName: 'Início (Checkin)', name: 'data_inicio', type: 'dateTime', default: '' },
			{ displayName: 'Latitude', name: 'latitude', type: 'number', default: 0 },
			{ displayName: 'Longitude', name: 'longitude', type: 'number', default: 0 },
			{ displayName: 'Observação', name: 'observacao', type: 'string', default: '' },
			{ displayName: 'Realização (Checkout)', name: 'data_realizacao', type: 'dateTime', default: '' },
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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
