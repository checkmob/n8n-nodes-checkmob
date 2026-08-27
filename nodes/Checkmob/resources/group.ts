import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['group'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar grupo pelo ID', action: 'Buscar grupo' },
			{ name: 'Criar', value: 'post', description: 'Criar um novo grupo', action: 'Criar grupo' },
			{ name: 'Editar', value: 'put', description: 'Substituir um grupo existente', action: 'Editar grupo' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir um grupo', action: 'Excluir grupo' },
			{ name: 'Listar', value: 'list', description: 'Listar grupos', action: 'Listar grupos' },
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
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Página a buscar (começa em 1)',
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Itens por página (máximo 100)',
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Busca textual por nome ou palavra-chave',
	},
	{
		displayName: 'IDs Dos Usuários (Separados Por Vírgula)',
		name: 'groupFilterIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Filtrar grupos que contêm estes usuários. Ex: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'Atualizado Após',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['list'] } },
		description: 'Sync incremental: retorna apenas registros atualizados após esta data',
	},

	// ── Buscar / Editar / Excluir ───────────────────────────────────────────────
	{
		displayName: 'ID Do Grupo',
		name: 'groupId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['get', 'put', 'delete'] } },
	},

	// ── Criar / Editar ───────────────────────────────────────────────────────────
	{
		displayName: 'Nome',
		name: 'groupName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'Nome do grupo',
	},
	{
		displayName: 'IDs Dos Usuários (Separados Por Vírgula)',
		name: 'groupIdsUser',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'IDs dos usuários que fazem parte do grupo. Ex: 1,2,3.',
		placeholder: '1,2,3',
	},
	{
		displayName: 'ID De Origem',
		name: 'groupIdOrigem',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['group'], operation: ['post', 'put'] } },
		description: 'ID de origem do grupo (opcional)',
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
		const idsUserRaw = this.getNodeParameter('groupFilterIdsUser', i, '') as string;
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (idsUserRaw.trim()) reqBody.ids_usuario = toNumArray(idsUserRaw);
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/grupos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('groupName', i) as string;
		const idsUserRaw = this.getNodeParameter('groupIdsUser', i, '') as string;
		const idOrigem = this.getNodeParameter('groupIdOrigem', i, 0) as number;

		const reqBody: IDataObject = { nome };
		if (idsUserRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUserRaw);
		if (idOrigem) reqBody.id_origem = idOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/grupos/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('groupId', i) as number;
		const nome = this.getNodeParameter('groupName', i) as string;
		const idsUserRaw = this.getNodeParameter('groupIdsUser', i, '') as string;
		const idOrigem = this.getNodeParameter('groupIdOrigem', i, 0) as number;

		const reqBody: IDataObject = { nome };
		if (idsUserRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUserRaw);
		if (idOrigem) reqBody.id_origem = idOrigem;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('groupId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/grupos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
