import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['serviceOrder'] } },
		options: [
			{ name: 'Alterar Status', value: 'changeStatus', description: 'Alterar status de uma OS', action: 'Alterar status de OS' },
			{ name: 'Buscar', value: 'get', description: 'Buscar ordem de serviço pelo ID', action: 'Buscar ordem de servico' },
			{ name: 'Criar', value: 'post', description: 'Criar ordem de serviço', action: 'Criar ordem de servico' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir uma ordem de serviço', action: 'Excluir ordem de servico' },
			{ name: 'Excluir Em Lote', value: 'deleteBulk', description: 'Excluir ordens de serviço em lote pelos IDs (máx. 500).', action: 'Excluir ordens de servico em lote' },
			{ name: 'Listar', value: 'list', description: 'Listar ordens de serviço', action: 'Listar ordens de servico' },
			{ name: 'Listar Status', value: 'listStatus', description: 'Listar status disponíveis das OS', action: 'Listar status de OS' },
			{ name: 'Substituir', value: 'put', description: 'Substituir ordem de serviço (campo ausente preserva valor atual)', action: 'Substituir ordem de servico' },
		],
		default: 'list',
	},

	// ── Listar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
	},
	{
		displayName: 'Filtros Adicionais',
		name: 'soListFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['list'] } },
		options: [
			{ displayName: 'Agendada Antes', name: 'data_agendada_antes', type: 'dateTime', default: '' },
			{ displayName: 'Agendada Após', name: 'data_agendada_apos', type: 'dateTime', default: '' },
			{
				displayName: 'Ativa',
				name: 'ativa',
				type: 'options',
				options: [{ name: 'Todas', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Atualizada Após', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Sync incremental' },
			{ displayName: 'Código', name: 'codigo', type: 'number', default: 0 },
			{
				displayName: 'Concluída',
				name: 'concluida',
				type: 'options',
				options: [{ name: 'Todas', value: 'all' }, { name: 'Sim', value: 'true' }, { name: 'Não', value: 'false' }],
				default: 'all',
			},
			{ displayName: 'Criada Antes', name: 'data_criacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Criada Após', name: 'data_criacao_apos', type: 'dateTime', default: '' },
			{ displayName: 'ID Do Cliente', name: 'id_cliente', type: 'number', default: 0 },
			{ displayName: 'IDs (Separados Por Vírgula)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Cliente (Separados Por Vírgula)', name: 'ids_cliente', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Contato (Separados Por Vírgula)', name: 'ids_contato', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Grupo (Separados Por Vírgula)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Segmento (Separados Por Vírgula)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Status (Separados Por Vírgula)', name: 'ids_status', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Tipo De Serviço (Separados Por Vírgula)', name: 'ids_tipo_servico', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Usuário (Separados Por Vírgula)', name: 'ids_usuario', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Prioridade Máxima', name: 'prioridade_max', type: 'number', default: 0 },
			{ displayName: 'Prioridade Mínima', name: 'prioridade_min', type: 'number', default: 0 },
		],
	},

	// ── Buscar / Excluir ─────────────────────────────────────────────────────────
	{
		displayName: 'ID Da OS',
		name: 'soId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['get', 'delete'] } },
	},

	// ── Criar / Substituir ───────────────────────────────────────────────────────
	{
		displayName: 'ID Da OS',
		name: 'soPutId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['put'] } },
	},
	{
		displayName: 'ID Do Cliente',
		name: 'soIdCliente',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Nome',
		name: 'soName',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Campos Opcionais',
		name: 'soOptional',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
		options: [
			{ displayName: 'Ativa', name: 'ativa', type: 'boolean', default: true },
			{ displayName: 'Comentário', name: 'comentario', type: 'string', default: '' },
			{ displayName: 'Concluída', name: 'concluida', type: 'boolean', default: false },
			{ displayName: 'Criada Para Mim', name: 'criada_para_mim', type: 'boolean', default: false },
			{ displayName: 'Data Agendada', name: 'data_agendada', type: 'dateTime', default: '' },
			{ displayName: 'Exige Checklist De Conclusão', name: 'exige_checklist_conclusao', type: 'boolean', default: false },
			{ displayName: 'ID Do Contato', name: 'id_contato', type: 'number', default: 0 },
			{ displayName: 'ID Do Grupo', name: 'id_grupo', type: 'number', default: 0 },
			{ displayName: 'ID Do Segmento', name: 'id_segmento', type: 'number', default: 0 },
			{ displayName: 'ID Do Tipo De Serviço', name: 'id_tipo_servico', type: 'number', default: 0 },
			{ displayName: 'Início Agendado', name: 'inicio_agendado', type: 'dateTime', default: '' },
			{ displayName: 'Prioridade', name: 'prioridade', type: 'number', default: 0 },
		],
	},
	{
		displayName: 'IDs Dos Usuários (Separados Por Vírgula)',
		name: 'soIdsUsers',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['post', 'put'] } },
		placeholder: '1,2,3',
	},

	// ── Excluir em Lote ──────────────────────────────────────────────────────────
	{
		displayName: 'IDs Das OS (Separados Por Vírgula)',
		name: 'soDeleteIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['deleteBulk'] } },
		description: 'Máximo 500 por chamada. Ex: 1,2,3.',
		placeholder: '1,2,3',
	},

	// ── Alterar Status ───────────────────────────────────────────────────────────
	{
		displayName: 'ID Da OS',
		name: 'soStatusId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['serviceOrder'], operation: ['changeStatus'] } },
	},
	{
		displayName: 'ID Do Status',
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
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const filters = this.getNodeParameter('soListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
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

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/ordens-servico/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
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
		const nome = this.getNodeParameter('soName', i, '') as string;
		const optional = this.getNodeParameter('soOptional', i, {}) as IDataObject;
		const idsUsersRaw = this.getNodeParameter('soIdsUsers', i, '') as string;

		const reqBody: IDataObject = { id_cliente: idCliente, ...optional };
		if (nome) reqBody.nome = nome;
		if (idsUsersRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUsersRaw);

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

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
