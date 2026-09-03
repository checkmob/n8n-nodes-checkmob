import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['addressPerson'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get the person\'s address', action: 'Get person address' },
			{ name: 'Replace', value: 'put', description: 'Replace the person\'s address', action: 'Replace person address' },
		],
		default: 'get',
	},
	{
		displayName: 'Person ID',
		name: 'addrPersonId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['get', 'put'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
		options: [
			{ displayName: 'City ID', name: 'addrIdCity', type: 'number', default: 0 },
			{ displayName: 'Complement', name: 'addrComplement', type: 'string', default: '' },
			{ displayName: 'Latitude', name: 'addrLatitude', type: 'number', default: 0 },
			{ displayName: 'Longitude', name: 'addrLongitude', type: 'number', default: 0 },
			{ displayName: 'Neighborhood', name: 'addrNeighborhood', type: 'string', default: '' },
			{ displayName: 'Number', name: 'addrNumber', type: 'string', default: '' },
			{ displayName: 'State ID', name: 'addrIdState', type: 'number', default: 0 },
			{ displayName: 'Title', name: 'addrTitle', type: 'string', default: '' },
			{ displayName: 'ZIP Code', name: 'addrZipCode', type: 'string', default: '' },
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
		const addrPersonId = this.getNodeParameter('addrPersonId', i) as number;

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'GET',
			url: `${baseUrl}/v2/pessoas/${addrPersonId}/endereco`,
			headers: authHeaders,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	if (operation === 'put') {
		const addrPersonId = this.getNodeParameter('addrPersonId', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const reqBody: IDataObject = {
			titulo: (additionalFields.addrTitle as string) ?? '',
			numero: (additionalFields.addrNumber as string) ?? '',
			complemento: (additionalFields.addrComplement as string) ?? '',
			bairro: (additionalFields.addrNeighborhood as string) ?? '',
			cep: (additionalFields.addrZipCode as string) ?? '',
			id_cidade: (additionalFields.addrIdCity as number) ?? 0,
			id_estado: (additionalFields.addrIdState as number) ?? 0,
			latitude: (additionalFields.addrLatitude as number) ?? 0,
			longitude: (additionalFields.addrLongitude as number) ?? 0,
		};

		const { statusCode, body } = await apiRequest.call(this, {
			method: 'PUT',
			url: `${baseUrl}/v2/pessoas/${addrPersonId}/endereco`,
			headers: authHeaders,
			body: reqBody,
		});
		assertApiSuccess(statusCode, body, this.getNode());

		return this.helpers.returnJsonArray([body as IDataObject]);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
}
