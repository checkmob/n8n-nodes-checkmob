import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess, toList } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['addressClient'] } },
		options: [
			{ name: 'List', value: 'get', description: 'List client addresses', action: 'List client addresses' },
			{ name: 'Replace Main', value: 'put', description: "Replace the client's main address", action: 'Replace client address' },
		],
		default: 'get',
	},
	{
		displayName: 'Client ID',
		name: 'addrClientId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['addressClient'], operation: ['get', 'put'] } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'] } },
	},
	{
		displayName: 'Per Page',
		name: 'perPage',
		type: 'number',
		default: 25,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'] } },
	},
	{
		displayName: 'Description',
		name: 'addrDescricao',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Street Address',
		name: 'address',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Number',
		name: 'number',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Complement',
		name: 'complement',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'Neighborhood',
		name: 'neighborhood',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'ZIP Code',
		name: 'zipCode',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
	},
	{
		displayName: 'State',
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

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
