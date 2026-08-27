import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['person'] } },
		options: [
			{ name: 'Ativar/Inativar Em Lote', value: 'status', description: 'Ativar ou inativar pessoas em lote (máx. 500).', action: 'Ativar ou inativar pessoas' },
			{ name: 'Buscar', value: 'get', description: 'Buscar uma pessoa pelo ID', action: 'Buscar pessoa' },
			{ name: 'Criar', value: 'post', description: 'Criar uma nova pessoa', action: 'Criar pessoa' },
			{ name: 'Desvincular Clientes', value: 'unlinkClients', description: 'Desfazer vínculo entre pessoa e clientes (máx. 500).', action: 'Desvincular pessoa de clientes' },
			{ name: 'Editar', value: 'put', description: 'Editar uma pessoa existente', action: 'Editar pessoa' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir uma pessoa', action: 'Excluir pessoa' },
			{ name: 'Listar', value: 'list', description: 'Listar pessoas/contatos', action: 'Listar pessoas' },
			{ name: 'Vincular Clientes', value: 'linkClients', description: 'Vincular uma pessoa a um ou mais clientes (máx. 500).', action: 'Vincular pessoa a clientes' },
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
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
	},
	{
		displayName: 'Ativo',
		name: 'personActive',
		type: 'options',
		options: [
			{ name: 'Todos', value: 'all' },
			{ name: 'Ativo', value: 'true' },
			{ name: 'Inativo', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
	},
	{
		displayName: 'Filtros Adicionais',
		name: 'personListFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['list'] } },
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'IDs (Separados Por Vírgula)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Clientes (Separados Por Vírgula)', name: 'ids_clientes', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'Atualizado Após', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Sync incremental' },
		],
	},

	// ── Buscar / Excluir ─────────────────────────────────────────────────────────
	{
		displayName: 'ID Da Pessoa',
		name: 'personId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['get', 'delete'] } },
	},

	// ── Criar ────────────────────────────────────────────────────────────────────
	{
		displayName: 'Nome',
		name: 'personName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['post'] } },
	},
	{
		displayName: 'Campos Adicionais',
		name: 'personPostFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['post'] } },
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'Telefone', name: 'telefone', type: 'string', default: '' },
			{ displayName: 'Celular', name: 'celular', type: 'string', default: '' },
			{ displayName: 'IDs De Clientes (Separados Por Vírgula)', name: 'idsClientes', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Editar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'ID Da Pessoa',
		name: 'personEditId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['put'] } },
	},
	{
		displayName: 'Campos A Atualizar',
		name: 'personPutFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['person'], operation: ['put'] } },
		options: [
			{ displayName: 'Ativo', name: 'ativo', type: 'boolean', default: true },
			{ displayName: 'Celular', name: 'celular', type: 'string', default: '' },
			{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: 'name@email.com' },
			{ displayName: 'Nome', name: 'nome', type: 'string', default: '' },
			{ displayName: 'Telefone', name: 'telefone', type: 'string', default: '' },	
		],
	},

	// ── Ativar/Inativar em Lote ──────────────────────────────────────────────────
	{
		displayName: 'IDs Das Pessoas (Separados Por Vírgula)',
		name: 'personStatusIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['status'] } },
		description: 'Máximo 500 por chamada. Ex: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'Ativo',
		name: 'personStatusAtivo',
		type: 'boolean',
		default: true,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['status'] } },
	},

	// ── Vincular / Desvincular Clientes ──────────────────────────────────────────
	{
		displayName: 'ID Da Pessoa',
		name: 'personLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['linkClients', 'unlinkClients'] } },
	},
	{
		displayName: 'IDs Dos Clientes (Separados Por Vírgula)',
		name: 'personLinkClientIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['person'], operation: ['linkClients', 'unlinkClients'] } },
		description: 'Máximo 500 por chamada. Ex: 1,2,3.',
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
		const activeParam = this.getNodeParameter('personActive', i, 'all') as string;
		const filters = this.getNodeParameter('personListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (activeParam !== 'all') reqBody.ativo = activeParam === 'true';
		if (typeof filters.email === 'string' && filters.email.trim()) reqBody.email = filters.email;
		if (typeof filters.ids === 'string' && filters.ids.trim()) reqBody.ids = toNumArray(filters.ids);
		if (typeof filters.ids_clientes === 'string' && filters.ids_clientes.trim()) {
			reqBody.ids_clientes = toNumArray(filters.ids_clientes);
		}
		if (filters.atualizado_apos) reqBody.atualizado_apos = filters.atualizado_apos;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/pessoas/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
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

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
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

		return this.helpers.returnJsonArray([{ idsPessoas, ativo, sucesso: true }]);
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

		return this.helpers.returnJsonArray([{ idPessoa, idsClientes, sucesso: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
