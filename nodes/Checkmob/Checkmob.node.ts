import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import * as category from './resources/category';
import * as customField from './resources/customField';
import * as typeService from './resources/typeService';
import * as step from './resources/step';
import * as temperature from './resources/temperature';
import * as serviceStatus from './resources/serviceStatus';
import * as marketSector from './resources/marketSector';
import * as objective from './resources/objective';
import * as group from './resources/group';
import * as segment from './resources/segment';
import * as client from './resources/client';
import * as person from './resources/person';
import * as addressClient from './resources/addressClient';
import * as addressPerson from './resources/addressPerson';
import * as user from './resources/user';
import * as noteClient from './resources/noteClient';
import * as serviceOrder from './resources/serviceOrder';
import * as service from './resources/service';
import * as checklist from './resources/checklist';
import * as answerChecklist from './resources/answerChecklist';
import * as travel from './resources/travel';

interface ResourceModule {
	description: INodeProperties[];
	execute(
		this: IExecuteFunctions,
		i: number,
		baseUrl: string,
		authHeaders: IDataObject,
	): Promise<INodeExecutionData[]>;
}

const resources: Record<string, ResourceModule> = {
	category,
	customField,
	typeService,
	step,
	temperature,
	serviceStatus,
	marketSector,
	objective,
	group,
	segment,
	client,
	person,
	addressClient,
	addressPerson,
	user,
	noteClient,
	serviceOrder,
	service,
	checklist,
	answerChecklist,
	travel,
};

const resourceSelector: INodeProperties = {
	displayName: 'Recurso',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Campo Personalizado', value: 'customField', description: 'Listar campos personalizados' },
		{ name: 'Categoria', value: 'category', description: 'Listar categorias' },
		{ name: 'Cliente', value: 'client', description: 'Gerenciar clientes' },
		{ name: 'Deslocamento', value: 'travel', description: 'Consultar quilometragem, custo e aprovação de deslocamentos' },
		{ name: 'Endereço De Pessoa', value: 'addressPerson', description: 'Buscar e substituir endereço de pessoa' },
		{ name: 'Endereço Do Cliente', value: 'addressClient', description: 'Listar e substituir endereço do cliente' },
		{ name: 'Etapa', value: 'step', description: 'Listar etapas' },
		{ name: 'Grupo', value: 'group', description: 'Gerenciar grupos' },
		{ name: 'Nota Do Cliente', value: 'noteClient', description: 'Gerenciar notas do cliente' },
		{ name: 'Objetivo', value: 'objective', description: 'Listar objetivos' },
		{ name: 'Ordem De Serviço', value: 'serviceOrder', description: 'Gerenciar ordens de serviço' },
		{ name: 'Pessoa', value: 'person', description: 'Gerenciar pessoas' },
		{ name: 'Questionário', value: 'checklist', description: 'Consultar questionários e gerenciar vínculos' },
		{ name: 'Registro', value: 'service', description: 'Gerenciar registros (visitas)' },
		{ name: 'Respostas De Questionário', value: 'answerChecklist', description: 'Consultar respostas de questionários' },
		{ name: 'Segmento', value: 'segment', description: 'Gerenciar segmentos' },
		{ name: 'Setor De Mercado', value: 'marketSector', description: 'Listar setores de mercado' },
		{ name: 'Status De Serviço', value: 'serviceStatus', description: 'Listar status de serviço' },
		{ name: 'Temperatura', value: 'temperature', description: 'Listar temperaturas' },
		{ name: 'Tipo De Serviço', value: 'typeService', description: 'Listar tipos de serviço' },
		{ name: 'Usuário', value: 'user', description: 'Listar usuários e localização' },
	],
	default: 'category',
};


const languageSelector: INodeProperties = {
	displayName: 'Idioma',
	name: 'language',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Português (Pt-BR)', value: 'pt-BR' },
		{ name: 'English (en-US)', value: 'en-US' },
	],
	default: 'pt-BR',
	description: 'Idioma das mensagens de erro retornadas pela API',
};

export class Checkmob implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Checkmob',
		name: 'checkmob',
		icon: { light: 'file:checkmob.dark.svg', dark: 'file:checkmob.white.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Checkmob Field Service API v2',
		defaults: { name: 'Checkmob' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'checkmobApi', required: true }],
		properties: [
			resourceSelector,
			languageSelector,
			...category.description,
			...customField.description,
			...typeService.description,
			...step.description,
			...temperature.description,
			...serviceStatus.description,
			...marketSector.description,
			...objective.description,
			...group.description,
			...segment.description,
			...client.description,
			...person.description,
			...addressClient.description,
			...addressPerson.description,
			...user.description,
			...noteClient.description,
			...serviceOrder.description,
			...service.description,
			...checklist.description,
			...answerChecklist.description,
			...travel.description,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('checkmobApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		const lang = this.getNodeParameter('language', 0, 'pt-BR') as string;
		const authHeaders: IDataObject = {
			'Content-Type': 'application/json',
			'Accept-Language': lang,
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const handler = resources[resource];

				if (!handler) {
					throw new NodeOperationError(this.getNode(), `Recurso desconhecido: "${resource}"`);
				}

				returnData.push(...(await handler.execute.call(this, i, baseUrl, authHeaders)));
			} catch (error) {
				if (this.continueOnFail()) {
					const err = error as Error & { description?: string };
					const json: IDataObject = { error: err.message };
					const statusMatch = err.message.match(/^HTTP (\d+)/);
					if (statusMatch) json.statusCode = parseInt(statusMatch[1], 10);
					if (err.description) {
						try { json.details = JSON.parse(err.description); } catch { json.details = err.description; }
					}
					returnData.push({ json, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeOperationError || error instanceof NodeApiError) {
					throw new NodeOperationError(this.getNode(), error.message, {
						description: error.description ?? undefined,
					});
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}
