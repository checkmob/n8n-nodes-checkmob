import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['checklist'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar um questionário pelo ID', action: 'Buscar questionario' },
			{ name: 'Listar', value: 'list', description: 'Listar questionários', action: 'Listar questionarios' },	
			{ name: 'Remover Vínculo De Grupo', value: 'deleteLinkGroup', description: 'Desvincular um grupo do questionário', action: 'Remover vinculo de grupo' },
			{ name: 'Remover Vínculo De Segmento', value: 'deleteLinkSegment', description: 'Desvincular um segmento do questionário', action: 'Remover vinculo de segmento' },
			{ name: 'Vincular Grupo', value: 'linkGroup', description: 'Vincular um grupo ao questionário', action: 'Vincular grupo ao questionario' },			
			{ name: 'Vincular Segmento', value: 'linkSegment', description: 'Vincular um segmento ao questionário', action: 'Vincular segmento ao questionario' },
			
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
		displayOptions: { show: { resource: ['checklist'], operation: ['list'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['checklist'], operation: ['list'] } },
	},
	{
		displayName: 'Busca',
		name: 'clSearch',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['checklist'], operation: ['list'] } },
	},
	{
		displayName: 'Ativo',
		name: 'clActive',
		type: 'options',
		options: [
			{ name: 'Todos', value: 'all' },
			{ name: 'Ativo', value: 'true' },
			{ name: 'Inativo', value: 'false' },
		],
		default: 'all',
		displayOptions: { show: { resource: ['checklist'], operation: ['list'] } },
	},
	{
		displayName: 'Vigente Em',
		name: 'clVigenteEm',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['checklist'], operation: ['list'] } },
		description: 'Retorna apenas questionários vigentes na data informada',
	},

	// ── Buscar ───────────────────────────────────────────────────────────────────
	{
		displayName: 'ID Do Questionário',
		name: 'clGetId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['checklist'], operation: ['get'] } },
	},

	// ── Vincular / Remover Grupo e Segmento ──────────────────────────────────────
	{
		displayName: 'ID Do Questionário',
		name: 'clId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['checklist'], operation: ['linkGroup', 'deleteLinkGroup', 'linkSegment', 'deleteLinkSegment'] } },
	},
	{
		displayName: 'ID Do Grupo',
		name: 'clIdGroup',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['checklist'], operation: ['linkGroup', 'deleteLinkGroup'] } },
	},
	{
		displayName: 'ID Do Segmento',
		name: 'clIdSegment',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['checklist'], operation: ['linkSegment', 'deleteLinkSegment'] } },
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
		const search = this.getNodeParameter('clSearch', i, '') as string;
		const activeParam = this.getNodeParameter('clActive', i, 'all') as string;
		const vigenteEm = this.getNodeParameter('clVigenteEm', i, '') as string;

		const reqBody: IDataObject = { pagina: page, por_pagina: perPage };
		if (search.trim()) reqBody.busca = search;
		if (activeParam !== 'all') reqBody.ativo = activeParam === 'true';
		if (vigenteEm) reqBody.vigente_em = vigenteEm;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/questionarios/list`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('clGetId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/questionarios/${id}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'linkGroup') {
		const id = this.getNodeParameter('clId', i) as number;
		const idGrupo = this.getNodeParameter('clIdGroup', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/questionarios/${id}/grupos`,
			headers: authHeaders,
			body: { id_grupo: idGrupo },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, idGrupo, vinculado: true }]);
	}

	if (operation === 'deleteLinkGroup') {
		const id = this.getNodeParameter('clId', i) as number;
		const idGrupo = this.getNodeParameter('clIdGroup', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/questionarios/${id}/grupos/${idGrupo}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, idGrupo, desvinculado: true }]);
	}

	if (operation === 'linkSegment') {
		const id = this.getNodeParameter('clId', i) as number;
		const idSegmento = this.getNodeParameter('clIdSegment', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'POST',
			url: `${baseUrl}/v2/questionarios/${id}/segmentos`,
			headers: authHeaders,
			body: { id_segmento: idSegmento },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, idSegmento, vinculado: true }]);
	}

	if (operation === 'deleteLinkSegment') {
		const id = this.getNodeParameter('clId', i) as number;
		const idSegmento = this.getNodeParameter('clIdSegment', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'DELETE',
			url: `${baseUrl}/v2/questionarios/${id}/segmentos/${idSegmento}`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([{ id, idSegmento, desvinculado: true }]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
