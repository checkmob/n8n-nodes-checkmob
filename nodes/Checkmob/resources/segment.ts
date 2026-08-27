import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList, toNumArray } from '../transport';

const LINK_ADD: Record<string, string> = {
	linkClient: 'clientes',
	linkGroup: 'grupos',
	linkUser: 'usuarios',
};

const LINK_REMOVE: Record<string, string> = {
	deleteLinkClient: 'clientes',
	deleteLinkGroup: 'grupos',
	deleteLinkUser: 'usuarios',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['segment'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar segmento pelo ID', action: 'Buscar segmento' },
			{ name: 'Criar', value: 'post', description: 'Criar segmento', action: 'Criar segmento' },
			{ name: 'Editar', value: 'put', description: 'Substituir segmento', action: 'Editar segmento' },
			{ name: 'Excluir', value: 'delete', description: 'Excluir um segmento', action: 'Excluir segmento' },
			{ name: 'Listar', value: 'list', description: 'Listar segmentos', action: 'Listar segmentos' },
			{ name: 'Obter Vínculos', value: 'getLinks', description: 'Obter vínculos (usuários e grupos) do segmento', action: 'Obter vinculo do segmento' },
			{ name: 'Remover Vínculo De Cliente', value: 'deleteLinkClient', description: 'Desvincular um cliente do segmento', action: 'Remover vinculo de cliente' },
			{ name: 'Remover Vínculo De Grupo', value: 'deleteLinkGroup', description: 'Desvincular um grupo do segmento', action: 'Remover vinculo de grupo' },
			{ name: 'Remover Vínculo De Usuário', value: 'deleteLinkUser', description: 'Desvincular um usuário do segmento', action: 'Remover vinculo de usuario' },
			{ name: 'Vincular Cliente', value: 'linkClient', description: 'Vincular um cliente ao segmento', action: 'Vincular cliente ao segmento' },
			{ name: 'Vincular Grupo', value: 'linkGroup', description: 'Vincular um grupo ao segmento', action: 'Vincular grupo ao segmento' },
			{ name: 'Vincular Usuário', value: 'linkUser', description: 'Vincular um usuário ao segmento', action: 'Vincular usuario ao segmento' },
		],
		default: 'list',
	},

	// ── Buscar / Editar / Excluir / Obter Vínculos ──────────────────────────────
	{
		displayName: 'ID Do Segmento',
		name: 'segmentId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['get', 'put', 'delete', 'getLinks'] } },
	},

	// ── Listar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Busca',
		name: 'search',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Ativo',
		name: 'segActive',
		type: 'options',
		options: [
			{ name: 'Todos', value: 'all' },
			{ name: 'Ativo', value: 'true' },
			{ name: 'Inativo', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},
	{
		displayName: 'Atualizado Após',
		name: 'updatedAfter',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['list'] } },
	},

	// ── Criar ────────────────────────────────────────────────────────────────────
	{
		displayName: 'Nome',
		name: 'segName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
	},
	{
		displayName: 'IDs De Usuários (Separados Por Vírgula)',
		name: 'segIdsUsers',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
		placeholder: '1,2,3',
	},
	{
		displayName: 'IDs De Grupos (Separados Por Vírgula)',
		name: 'segIdsGroups',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['post'] } },
		placeholder: '1,2,3',
	},

	// ── Editar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Nome',
		name: 'segPutName',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['segment'], operation: ['put'] } },
		description: 'Deixe vazio para preservar o nome atual',
	},
	{
		displayName: 'Ativo',
		name: 'segPutActive',
		type: 'options',
		options: [
			{ name: 'Preservar Atual', value: 'keep' },
			{ name: 'Ativo', value: 'true' },
			{ name: 'Inativo', value: 'false' },
		],
		default: 'keep',
		displayOptions: { show: { resource: ['segment'], operation: ['put'] } },
	},

	// ── Operações de Vínculo ─────────────────────────────────────────────────────
	{
		displayName: 'ID Do Segmento',
		name: 'segmentLinkId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkClient', 'deleteLinkClient', 'linkGroup', 'deleteLinkGroup', 'linkUser', 'deleteLinkUser'] } },
	},
	{
		displayName: 'ID Do Cliente',
		name: 'segLinkedIdClient',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkClient', 'deleteLinkClient'] } },
	},
	{
		displayName: 'ID Do Grupo',
		name: 'segLinkedIdGroup',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkGroup', 'deleteLinkGroup'] } },
	},
	{
		displayName: 'ID Do Usuário',
		name: 'segLinkedIdUser',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['segment'], operation: ['linkUser', 'deleteLinkUser'] } },
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
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'getLinks') {
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/segmentos/${id}/vinculos`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'list') {
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;
		const search = this.getNodeParameter('search', i, '') as string;
		const activeParam = this.getNodeParameter('segActive', i, 'all') as string;
		const updatedAfter = this.getNodeParameter('updatedAfter', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (activeParam !== 'all') reqBody.ativo = activeParam === 'true';
		if (updatedAfter) reqBody.atualizado_apos = updatedAfter;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'post') {
		const nome = this.getNodeParameter('segName', i) as string;
		const idsUsersRaw = this.getNodeParameter('segIdsUsers', i, '') as string;
		const idsGroupsRaw = this.getNodeParameter('segIdsGroups', i, '') as string;

		const reqBody: IDataObject = { nome };
		if (idsUsersRaw.trim()) reqBody.ids_usuarios = toNumArray(idsUsersRaw);
		if (idsGroupsRaw.trim()) reqBody.ids_grupos = toNumArray(idsGroupsRaw);

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/post`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const id = this.getNodeParameter('segmentId', i) as number;
		const nome = this.getNodeParameter('segPutName', i, '') as string;
		const activeParam = this.getNodeParameter('segPutActive', i, 'keep') as string;

		const reqBody: IDataObject = {};
		if (nome.trim()) reqBody.nome = nome;
		if (activeParam !== 'keep') reqBody.ativo = activeParam === 'true';

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('segmentId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/segmentos/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, excluido: true }]);
	}

	if (LINK_ADD[operation]) {
		const subPath = LINK_ADD[operation];
		const idSegment = this.getNodeParameter('segmentLinkId', i) as number;
		const linkedId = this.getNodeParameter(
			subPath === 'clientes' ? 'segLinkedIdClient' : subPath === 'grupos' ? 'segLinkedIdGroup' : 'segLinkedIdUser',
			i,
		) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/segmentos/${idSegment}/${subPath}`,
			headers: authHeaders,
			body: { ids: [linkedId] },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idSegment, linkedId, vinculado: true }]);
	}

	if (LINK_REMOVE[operation]) {
		const subPath = LINK_REMOVE[operation];
		const idSegment = this.getNodeParameter('segmentLinkId', i) as number;
		const linkedId = this.getNodeParameter(
			subPath === 'clientes' ? 'segLinkedIdClient' : subPath === 'grupos' ? 'segLinkedIdGroup' : 'segLinkedIdUser',
			i,
		) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/segmentos/${idSegment}/${subPath}/${linkedId}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ idSegment, linkedId, desvinculado: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
