import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['addressClient'] } },
		options: [
			{ name: 'Listar', value: 'get', description: 'Listar endereços do cliente', action: 'Listar enderecos do cliente' },
			{ name: 'Substituir Principal', value: 'put', description: 'Substituir o endereço principal do cliente', action: 'Substituir endereco do cliente' },
		],
		default: 'get',
	},
	{
		displayName: 'ID Do Cliente',
		name: 'addrClientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['addressClient'], operation: ['get', 'put'] } },
	},
	{
		displayName: 'Página',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'] } },
	},
	{
		displayName: 'Por Página',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'] } },
	},
	{
		displayName: 'Descrição',
		name: 'addrDescricao',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Logradouro',
		name: 'address',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Número',
		name: 'number',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Complemento',
		name: 'complement',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Bairro',
		name: 'neighborhood',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'CEP',
		name: 'zipCode',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Cidade',
		name: 'city',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Estado',
		name: 'state',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
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
		const addrClientId = this.getNodeParameter('addrClientId', i) as number;
		const page = this.getNodeParameter('page', i, 1) as number;
		const perPage = this.getNodeParameter('perPage', i, 25) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/clientes/${addrClientId}/endereco`,
			headers: authHeaders,
			qs: { pagina: page, por_pagina: perPage },
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray(toList(body));
	}

	if (operation === 'put') {
		const addrClientId = this.getNodeParameter('addrClientId', i) as number;
		const reqBody: IDataObject = {
			id_cliente: addrClientId,
			descricao: this.getNodeParameter('addrDescricao', i, '') as string,
			logradouro: this.getNodeParameter('address', i, '') as string,
			numero: this.getNodeParameter('number', i, '') as string,
			complemento: this.getNodeParameter('complement', i, '') as string,
			bairro: this.getNodeParameter('neighborhood', i, '') as string,
			cep: this.getNodeParameter('zipCode', i, '') as string,
			cidade: this.getNodeParameter('city', i, '') as string,
			estado: this.getNodeParameter('state', i, '') as string,
			latitude: this.getNodeParameter('latitude', i, 0) as number,
			longitude: this.getNodeParameter('longitude', i, 0) as number,
		};

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/clientes/${addrClientId}/endereco`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
