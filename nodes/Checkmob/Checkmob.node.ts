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
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Category', value: 'category', description: 'List categories' },
		{ name: 'Checklist', value: 'checklist', description: 'Query checklists and manage links' },
		{ name: 'Checklist Answer', value: 'answerChecklist', description: 'Query checklist answers' },
		{ name: 'Client', value: 'client', description: 'Manage clients' },
		{ name: 'Client Address', value: 'addressClient', description: 'List and replace the client\'s address' },
		{ name: 'Client Note', value: 'noteClient', description: 'Manage client notes' },
		{ name: 'Custom Field', value: 'customField', description: 'List custom fields' },
		{ name: 'Group', value: 'group', description: 'Manage groups' },
		{ name: 'Market Sector', value: 'marketSector', description: 'List market sectors' },
		{ name: 'Objective', value: 'objective', description: 'List objectives' },
		{ name: 'Person', value: 'person', description: 'Manage people' },
		{ name: 'Person Address', value: 'addressPerson', description: 'Get and replace a person\'s address' },
		{ name: 'Record', value: 'service', description: 'Manage records (visits)' },
		{ name: 'Segment', value: 'segment', description: 'Manage segments' },
		{ name: 'Service Order', value: 'serviceOrder', description: 'Manage service orders' },
		{ name: 'Service Status', value: 'serviceStatus', description: 'List service statuses' },
		{ name: 'Service Type', value: 'typeService', description: 'List service types' },
		{ name: 'Step', value: 'step', description: 'List steps' },
		{ name: 'Temperature', value: 'temperature', description: 'List temperatures' },
		{ name: 'Travel', value: 'travel', description: 'Query travel mileage, cost, and approval' },
		{ name: 'User', value: 'user', description: 'List users and location' },
	],
	default: 'category',
};


const languageSelector: INodeProperties = {
	displayName: 'Language',
	name: 'language',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Portuguese (Pt-BR)', value: 'pt-BR' },
		{ name: 'English (en-US)', value: 'en-US' },
	],
	default: 'pt-BR',
	description: 'Language of the error messages returned by the API',
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
					throw new NodeOperationError(this.getNode(), `Unknown resource: "${resource}"`);
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
