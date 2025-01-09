'use server';

import { createClient } from '@/lib/supabase/server';
import { agentSchema } from '../schemas';

export async function runAgentPreview(prompt: string, broadcastId: string) {
	const GC_CF_URL = 'https://core-run-agent-314125185535.us-central1.run.app/preview';
	const response = await fetch(GC_CF_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ prompt, broadcastId }),
	});
	return response.ok;
}

export async function runAgent(props: { formData: FormData; datatableId: string; firstChunk?: boolean; organizationId: string }) {
	const { formData, datatableId, firstChunk = false, organizationId } = props;
	const supabase = createClient();
	console.log(formData, datatableId, firstChunk);

	// GET DATATABLE STATE
	const { data: datatable, error: datatableError } = await supabase
		.from('datatable')
		.select('id, sort_config, filter_config')
		.eq('id', datatableId)
		.single();
	if (datatableError)
		return {
			errors: datatableError.message,
		};

	// #############################################################################################################################
	// GET FORM DATA
	// #############################################################################################################################
	const agent = JSON.parse(formData.get('agent') as string);
	const generationIds: string[] = JSON.parse(formData.get('generationIds') as string);
	const validatedFields = agentSchema.safeParse({ agent, generationIds });
	if (!validatedFields.success) {
		console.error('Failed to validate agent schema');
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}

	// #############################################################################################################################
	// GET PARAM
	// #############################################################################################################################
	if (generationIds == null) throw new Error('No generationId found');
	const { data: paramsData, error: paramsError } = await supabase
		.from('generation_param')
		.select('id, name, group, billing_factor')
		.in('id', generationIds);
	if (paramsError) throw paramsError;
	console.log('params', paramsData);

	// #############################################################################################################################
	// GET API KEY
	// #############################################################################################################################
	console.log('organizationId', organizationId);
	const { data: apiData, error: apiDataError } = await supabase.from('organization_api_key').select('*').eq('organization_id', organizationId).single();
	if (apiDataError) {
		console.error(apiDataError.message);
		return {
			errors: apiDataError.message,
		};
	}

	// #############################################################################################################################
	// PREPARE NEW COLUMN
	// #############################################################################################################################
	let newColumns = [];

	// #############################################################################################################################
	// RUN API
	// #############################################################################################################################
	const jobIds = [];
	for (const generationId of generationIds) {
		const param = paramsData.filter((param) => param.id === generationId)[0];
		const columnId = crypto.randomUUID();
		const jobRef = crypto.randomUUID();
		newColumns.push({ id: columnId, name: `${param.name}`, width: 300, visible: true, source: jobRef });

		const body = {
			apiKey: apiData.key,
			data: {
				datatableId,
				sortConfig: datatable?.sort_config,
				filterConfig: datatable?.filter_config,
				formField: null,
				columnId: columnId,
				payload: validatedFields.data.agent,
				jobRef,
			},
			webhook: 'peeker.ai',
			isFirstChunk: true,
			limit: 5,
		};

		const CONFIG_GCRUN_URL = `https://core-run-queuer-314125185535.us-central1.run.app/job/bulk/${generationId}`;
		const response = await fetch(CONFIG_GCRUN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ ...body }),
		});
		const data = await response.json();
		jobIds.push(data.id);
	}

	// #############################################################################################################################
	// SAFE NEW COLUMN
	// #############################################################################################################################
	const { data: datatableData } = await supabase.from('datatable').select('columns').eq('id', datatableId).single();
	const currentColumns = (datatableData?.columns as any[]) || [];
	await supabase
		.from('datatable')
		.update({
			columns: [...currentColumns, ...newColumns],
		})
		.eq('id', datatableId)
		.throwOnError();
	return { jobs: jobIds };
}
