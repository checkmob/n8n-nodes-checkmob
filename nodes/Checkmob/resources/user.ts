import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar um usuário pelo ID', action: 'Buscar usuario' },
			{ name: 'Listar', value: 'list', description: 'Listar usuários', action: 'Listar usuarios' },
			{ name: 'Localizações', value: 'location', description: 'Buscar as localizações registradas de um usuário', action: 'Buscar localizacoes do usuario' },
		],
		default: 'list',
	},
	{
		displayName: 'ID Do Usuário',
		name: 'idUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['get', 'location'] } },
	},
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
	},
	{
		displayName: 'Filtros Adicionais',
		name: 'userListFilters',
		type: 'collection',
		placeholder: 'Adicionar filtro',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['list'] } },
		options: [
			{
				displayName: 'Ativo',
				name: 'ativo',
				type: 'options',
				options: [
					{ name: 'Todos', value: 'all' },
					{ name: 'Ativo', value: 'true' },
					{ name: 'Inativo', value: 'false' },
				],
				default: 'all',
			},
			{ displayName: 'IDs (Separados Por Vírgula)', name: 'ids', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'IDs De Grupo (Separados Por Vírgula)', name: 'ids_grupo', type: 'string', default: '', placeholder: '1,2,3' },
			{ displayName: 'ID Do Perfil', name: 'id_perfil', type: 'number', default: 0 },
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
		const idUser = this.getNodeParameter('idUser', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/usuarios/${idUser}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const filters = this.getNodeParameter('userListFilters', i, {}) as IDataObject;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (typeof filters.ativo === 'string' && filters.ativo !== 'all') reqBody.ativo = filters.ativo === 'true';
		if (typeof filters.ids === 'string' && filters.ids.trim()) reqBody.ids = toNumArray(filters.ids);
		if (typeof filters.ids_grupo === 'string' && filters.ids_grupo.trim()) reqBody.ids_grupo = toNumArray(filters.ids_grupo);
		if (filters.id_perfil) reqBody.id_perfil = filters.id_perfil;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/usuarios/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'location') {
		const idUser = this.getNodeParameter('idUser', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/usuarios/${idUser}/localizacao`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(Array.isArray(body) ? (body as IDataObject[]) : [body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
