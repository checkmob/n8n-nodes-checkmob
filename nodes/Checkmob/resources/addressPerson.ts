import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, assertApiSuccess } from '../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Operação',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['addressPerson'] } },
		options: [
			{ name: 'Buscar', value: 'get', description: 'Buscar o endereço da pessoa', action: 'Buscar endereco de pessoa' },
			{ name: 'Substituir', value: 'put', description: 'Substituir o endereço da pessoa', action: 'Substituir endereco de pessoa' },
		],
		default: 'get',
	},
	{
		displayName: 'ID Da Pessoa',
		name: 'addrPersonId',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['get', 'put'] } },
	},
	{
		displayName: 'Título',
		name: 'addrTitle',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'Número',
		name: 'addrNumber',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'Complemento',
		name: 'addrComplement',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'Bairro',
		name: 'addrNeighborhood',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'CEP',
		name: 'addrZipCode',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'ID Da Cidade',
		name: 'addrIdCity',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'ID Do Estado',
		name: 'addrIdState',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'Latitude',
		name: 'addrLatitude',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
	},
	{
		displayName: 'Longitude',
		name: 'addrLongitude',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['addressPerson'], operation: ['put'] } },
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
		const reqBody: IDataObject = {
			titulo: this.getNodeParameter('addrTitle', i, '') as string,
			numero: this.getNodeParameter('addrNumber', i, '') as string,
			complemento: this.getNodeParameter('addrComplement', i, '') as string,
			bairro: this.getNodeParameter('addrNeighborhood', i, '') as string,
			cep: this.getNodeParameter('addrZipCode', i, '') as string,
			id_cidade: this.getNodeParameter('addrIdCity', i, 0) as number,
			id_estado: this.getNodeParameter('addrIdState', i, 0) as number,
			latitude: this.getNodeParameter('addrLatitude', i, 0) as number,
			longitude: this.getNodeParameter('addrLongitude', i, 0) as number,
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

	throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`);
}
