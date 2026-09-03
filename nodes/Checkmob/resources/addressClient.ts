import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, apiRequestAllItems, assertApiSuccess } from '../transport';

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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['addressClient'], operation: ['get'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['addressClient'], operation: ['put'] } },
		options: [
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'Complement', name: 'complement', type: 'string', default: '' },
			{ displayName: 'Description', name: 'addrDescricao', type: 'string', default: '' },
			{ displayName: 'Latitude', name: 'latitude', type: 'number', default: 0 },
			{ displayName: 'Longitude', name: 'longitude', type: 'number', default: 0 },
			{ displayName: 'Neighborhood', name: 'neighborhood', type: 'string', default: '' },
			{ displayName: 'Number', name: 'number', type: 'string', default: '' },
			{ displayName: 'State', name: 'state', type: 'string', default: '' },
			{ displayName: 'Street Address', name: 'address', type: 'string', default: '' },
			{ displayName: 'ZIP Code', name: 'zipCode', type: 'string', default: '' },
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
		const addrClientId = this.getNodeParameter('addrClientId', i) as number;
		const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;

		const items = await apiRequestAllItems.call(
			this,
			{
				method: 'GET',
				url: `${baseUrl}/v2/clientes/${addrClientId}/endereco`,
				headers: authHeaders,
				qs: {},
				returnAll,
				limit,
			},
			this.getNode(),
		);

		return this.helpers.returnJsonArray(items);
	}

	if (operation === 'put') {
		const addrClientId = this.getNodeParameter('addrClientId', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const reqBody: IDataObject = {
			id_cliente: addrClientId,
			descricao: (additionalFields.addrDescricao as string) ?? '',
			logradouro: (additionalFields.address as string) ?? '',
			numero: (additionalFields.number as string) ?? '',
			complemento: (additionalFields.complement as string) ?? '',
			bairro: (additionalFields.neighborhood as string) ?? '',
			cep: (additionalFields.zipCode as string) ?? '',
			cidade: (additionalFields.city as string) ?? '',
			estado: (additionalFields.state as string) ?? '',
			latitude: (additionalFields.latitude as number) ?? 0,
			longitude: (additionalFields.longitude as number) ?? 0,
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
