import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray, parseJson } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['client'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar um cliente pelo ID', action: 'Buscar cliente' },
			{ name: 'Criar', value: 'post', description: 'Criar um novo cliente', action: 'Criar cliente' },
			{ name: 'Criar Em Lote', value: 'postBulk', description: 'Criar múltiplos clientes em uma única chamada (máx. 500).', action: 'Criar clientes em lote' },
			{ name: 'Desvincular Pessoas', value: 'unlinkPeople', description: 'Desfazer vínculo entre cliente e pessoas (máx. 500).', action: 'Desvincular pessoas do cliente' },
			{ name: 'Editar Parcialmente', value: 'patch', description: 'Atualizar parcialmente um cliente existente', action: 'Editar cliente parcialmente' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir um cliente', action: 'Excluir cliente' },
			{ name: 'Listar', value: 'list', description: 'Buscar clientes de forma paginada e com filtros', action: 'Listar clientes' },
			{ name: 'Substituir', value: 'put', description: 'Substituir um cliente existente', action: 'Substituir cliente' },
			{ name: 'Vincular Pessoas', value: 'linkPeople', description: 'Vincular uma ou mais pessoas ao cliente (máx. 500).', action: 'Vincular pessoas ao cliente' },	
		],
		default: 'list',
	},

	// ── Listar ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Página a buscar (começa em 1)',
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Itens por página (máximo 100)',
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		description: 'Busca textual por nome, código ou documento',
	},
	{
		displayName: 'Ativo',
		name: 'clientActive',
		type: 'options',
		options: [
			{ name: 'Todos', value: 'all' },
			{ name: 'Ativo', value: 'true' },
			{ name: 'Inativo', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
	},
	{
		displayName: 'Filtros Adicionais',
		name: 'clientListFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['client'], operation: ['list'] } },
		options: [
			{ displayName: 'Atualizado Após', name: 'atualizado_apos', type: 'dateTime', default: '', description: 'Sync incremental' },
			{ displayName: 'Códigos (Separados Por Vírgula)', name: 'codigos', type: 'string', default: '', placeholder: 'A001,A002' },
			{ displayName: 'Criado Antes', name: 'data_criacao_antes', type: 'dateTime', default: '' },
			{ displayName: 'Criado Após', name: 'data_criacao_apos', type: 'dateTime', default: '' },
			{ displayName: 'Documento', name: 'documento', type: 'string', default: '' },
			{ displayName: 'IDs (Separados Por Vírgula)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Categoria (Separados Por Vírgula)', name: 'ids_categoria', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Etapa (Separados Por Vírgula)', name: 'ids_etapa', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Segmento (Separados Por Vírgula)', name: 'ids_segmento', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Setor De Mercado (Separados Por Vírgula)', name: 'ids_setor_mercado', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Temperatura (Separados Por Vírgula)', name: 'ids_temperatura', type: 'string', default: '', placeholder: '1,2,3' },
		],
	},

	// ── Buscar / Substituir / Editar Parcialmente / Excluir ─────────────────────
	{
		displayName: 'ID Do Cliente',
		name: 'clientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['get', 'put', 'patch', 'delete'] } },
	},

	// ── Criar / Substituir / Editar Parcialmente ────────────────────────────────
	{
		displayName: 'Tipo',
		name: 'clientTipo',
		type: 'options',
		options: [
			{ name: 'Física', value: 'F' },
			{ name: 'Jurídica', value: 'J' },
			{ name: 'Estrangeiro', value: 'N' },
		],
		default: 'J',
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Nome',
		name: 'clientName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Documento',
		name: 'clientDocumento',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
		description: 'CPF, CNPJ ou documento estrangeiro',
	},
	{
		displayName: 'Ativo',
		name: 'clientAtivo',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['client'], operation: ['post', 'put'] } },
	},
	{
		displayName: 'Campos A Atualizar',
		name: 'clientPatchFields',
		type: 'collection',
		placeholder: 'Adicionar campo',
		default: {},
		displayOptions: { show: { resource: ['client'], operation: ['patch'] } },
		options: [
			{
				displayName: 'Tipo',
				name: 'tipo',
				type: 'options',
				options: [
					{ name: 'Física', value: 'F' },
					{ name: 'Jurídica', value: 'J' },
					{ name: 'Estrangeiro', value: 'N' },
				],
				default: 'J',
			},
			{ displayName: 'Nome', name: 'nome', type: 'string', default: '' },
			{ displayName: 'Documento', name: 'documento', type: 'string', default: '' },
			{ displayName: 'Ativo', name: 'ativo', type: 'boolean', default: true },
		],
	},

	// ── Criar em Lote ────────────────────────────────────────────────────────────
	{
		displayName: 'Clientes (JSON)',
		name: 'clientsBulkJson',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '[]',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['postBulk'] } },
		description: 'Array JSON com até 500 clientes a criar. Ex: [{"tipo":"J","nome":"Empresa","documento":"123","ativo":true}].',
	},

	// ── Vincular / Desvincular Pessoas ───────────────────────────────────────────
	{
		displayName: 'ID Do Cliente',
		name: 'clientLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['linkPeople', 'unlinkPeople'] } },
	},
	{
		displayName: 'IDs Das Pessoas (Separados Por Vírgula)',
		name: 'clientLinkPeopleIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['client'], operation: ['linkPeople', 'unlinkPeople'] } },
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
		const clientes = parseJson(clientsRaw, this.getNode(), 'Clientes (JSON)');

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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
